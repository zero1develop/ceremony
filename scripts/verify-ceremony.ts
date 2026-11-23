import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  exportVerificationKey,
  parseMpcParams,
  verify,
  type Groth16VerificationKey,
} from "@wonderland/cabure-crypto";

import { ceremonyConfig } from "../ceremony.config";

process.on("uncaughtException", (error: NodeJS.ErrnoException) => {
  if (
    error.code === "ERR_INVALID_STATE" &&
    error.message.includes("FileHandle")
  ) {
    return;
  }
  console.error(error);
  process.exit(1);
});

interface Receipt {
  circuitId: string;
  participantId: string;
  contributionIndex: number;
  contributionHash: string;
  clientContributionHash: string | null;
  serverContributionHash: string;
  previousContributionHash: string | null;
  chainHash: string;
  timestamp: number;
}

interface LocalReceipt extends Receipt {
  clientHk?: string;
}

interface CircuitSummary {
  circuitId: string;
  totalContributions: number;
  finalChainHash: string;
  finalContributionHash: string;
  finalZkeyHash: string;
  finalZkeyPath: string;
  verificationKey: Groth16VerificationKey;
}

interface Transcript {
  ceremony: {
    name: string;
    beaconHash: string;
    beaconSlot?: number;
    beaconSource: string;
    finalizedAt: number;
  };
  circuits: CircuitSummary[];
  receipts: Receipt[];
}

const DEFAULT_BEACON_API_URL = "https://ethereum-beacon-api.publicnode.com";

function flagValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function flagValues(name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index++) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    values.push(value);
    index++;
  }
  return values;
}

function sha256(data: Uint8Array): string {
  return `0x${createHash("sha256").update(data).digest("hex")}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new Error(message);
  }
}

async function readBytes(filePath: string): Promise<Uint8Array> {
  try {
    return new Uint8Array(await readFile(filePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Missing file: ${filePath}`);
    }
    throw error;
  }
}

async function readLocalReceipts(filePaths: string[]): Promise<LocalReceipt[]> {
  const receipts: LocalReceipt[] = [];
  for (const inputPath of filePaths) {
    const filePath = path.resolve(process.cwd(), inputPath);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`Local receipt file not found: ${filePath}`);
      }
      throw new Error(
        `Cannot parse local receipt file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Browser downloads are arrays. Also accept the API-shaped
    // { participantId, receipts } wrapper for operator convenience.
    const items = Array.isArray(parsed)
      ? parsed
      : parsed !== null &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { receipts?: unknown }).receipts)
        ? (parsed as { receipts: unknown[] }).receipts
        : null;
    if (!items || items.length === 0) {
      throw new Error(`Local receipt file contains no receipts: ${filePath}`);
    }

    for (const item of items) {
      if (item === null || typeof item !== "object") {
        throw new Error(`Invalid receipt entry in ${filePath}.`);
      }
      const receipt = item as LocalReceipt;
      if (
        typeof receipt.circuitId !== "string" ||
        typeof receipt.participantId !== "string" ||
        !Number.isSafeInteger(receipt.contributionIndex) ||
        receipt.contributionIndex <= 0 ||
        typeof receipt.serverContributionHash !== "string" ||
        typeof receipt.chainHash !== "string"
      ) {
        throw new Error(`Incomplete or invalid receipt entry in ${filePath}.`);
      }
      if (
        receipt.clientHk !== undefined &&
        receipt.clientHk !== receipt.serverContributionHash
      ) {
        throw new Error(
          `The contributor-computed hash does not match the server hash for ${receipt.circuitId} #${receipt.contributionIndex}.`,
        );
      }
      receipts.push(receipt);
    }
    console.log(`Local receipts: ${filePath} (${items.length})`);
  }
  return receipts;
}

async function verifyBeacon(transcript: Transcript): Promise<void> {
  if (process.argv.includes("--skip-beacon-check")) {
    console.log("Beacon source check skipped (--skip-beacon-check).\n");
    return;
  }

  const slot = transcript.ceremony.beaconSlot;
  if (!Number.isSafeInteger(slot) || (slot ?? 0) < 0) {
    throw new Error(
      "Transcript has no valid beaconSlot. Use --skip-beacon-check only for a deliberately user-supplied beacon.",
    );
  }

  const baseUrl =
    process.env.BEACON_API_URL?.trim() || DEFAULT_BEACON_API_URL;
  const url = `${baseUrl}/eth/v2/beacon/blocks/${slot}`;
  console.log(`Checking Ethereum beacon slot ${slot}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch beacon slot ${slot}: ${response.status} ${response.statusText}. ` +
        "Set BEACON_API_URL to use another beacon node, or use --skip-beacon-check for offline verification.",
    );
  }
  const payload = (await response.json()) as {
    data?: { message?: { slot?: string; body?: { randao_reveal?: string } } };
  };
  const returnedSlot = Number(payload.data?.message?.slot);
  const reveal = payload.data?.message?.body?.randao_reveal?.toLowerCase();
  if (returnedSlot !== slot || reveal !== transcript.ceremony.beaconHash.toLowerCase()) {
    throw new Error("Transcript beacon does not match the Ethereum beacon block.");
  }
  console.log("  Public beacon matches.\n");
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    console.log(`Usage: pnpm verify:ceremony [options]

Options:
  --output-dir <path>      Final data directory (default: public/finalize)
  --receipt <path>         Check a participant's ceremony-receipt.json
                           (may be repeated for multiple participants)
  --skip-beacon-check     Do not fetch and compare the Ethereum RANDAO reveal
  --help                  Show this help`);
    return;
  }

  const outputDir = path.resolve(
    process.cwd(),
    flagValue("--output-dir") ?? path.join("public", "finalize"),
  );
  const transcriptPath = path.join(outputDir, "transcript.json");
  const transcript = JSON.parse(
    await readFile(transcriptPath, "utf8"),
  ) as Transcript;

  if (transcript.ceremony?.name !== ceremonyConfig.name) {
    throw new Error(
      `Ceremony name mismatch: expected ${ceremonyConfig.name}, got ${transcript.ceremony?.name ?? "(missing)"}.`,
    );
  }
  if (!Array.isArray(transcript.circuits) || transcript.circuits.length === 0) {
    throw new Error("Transcript contains no finalized circuits.");
  }
  if (!Array.isArray(transcript.receipts)) {
    throw new Error("Transcript receipts are missing or invalid.");
  }

  console.log("=== Verify Ceremony Final Data ===\n");
  console.log(`Transcript: ${transcriptPath}`);
  console.log(`Ceremony:   ${transcript.ceremony.name}`);
  console.log(`Circuits:   ${transcript.circuits.length}\n`);

  const localReceipts = await readLocalReceipts(flagValues("--receipt"));
  if (localReceipts.length > 0) console.log();

  await verifyBeacon(transcript);

  const configured = new Map(
    ceremonyConfig.circuits.map((circuit) => [circuit.id, circuit]),
  );
  const seen = new Set<string>();

  for (const summary of transcript.circuits) {
    if (seen.has(summary.circuitId)) {
      throw new Error(`Duplicate circuit in transcript: ${summary.circuitId}.`);
    }
    seen.add(summary.circuitId);

    const circuit = configured.get(summary.circuitId);
    if (!circuit) {
      throw new Error(`Unknown circuit in transcript: ${summary.circuitId}.`);
    }
    if (!Number.isSafeInteger(summary.totalContributions) || summary.totalContributions < 0) {
      throw new Error(`Invalid contribution count for ${summary.circuitId}.`);
    }

    const expectedRelativeZkeyPath =
      `public/finalize/${summary.circuitId}.final.zkey`;
    if (summary.finalZkeyPath.replaceAll("\\", "/") !== expectedRelativeZkeyPath) {
      throw new Error(`Unexpected final zkey path for ${summary.circuitId}.`);
    }

    console.log(`[${summary.circuitId}]`);
    const finalZkeyPath = path.join(
      outputDir,
      `${summary.circuitId}.final.zkey`,
    );
    const vkeyPath = path.join(outputDir, `${summary.circuitId}.vkey.json`);
    const [finalZkey, r1cs, ptau] = await Promise.all([
      readBytes(finalZkeyPath),
      readBytes(path.resolve(process.cwd(), circuit.artifacts.r1csPath)),
      readBytes(path.resolve(process.cwd(), circuit.artifacts.ptauPath)),
    ]);

    if (sha256(finalZkey) !== summary.finalZkeyHash) {
      throw new Error(`Final zkey SHA-256 mismatch for ${summary.circuitId}.`);
    }
    console.log("  Final zkey hash matches transcript.");

    if (!(await verify(r1cs, ptau, finalZkey))) {
      throw new Error(`Cryptographic zkey verification failed for ${summary.circuitId}.`);
    }
    console.log("  R1CS/PTAU/zkey verification passed.");

    const exportedVkey = await exportVerificationKey(finalZkey);
    const savedVkey = JSON.parse(await readFile(vkeyPath, "utf8")) as unknown;
    assertEqual(
      savedVkey,
      exportedVkey,
      `Saved verification key does not match the final zkey for ${summary.circuitId}.`,
    );
    assertEqual(
      summary.verificationKey,
      exportedVkey,
      `Transcript verification key does not match the final zkey for ${summary.circuitId}.`,
    );
    console.log("  Verification keys match.");

    const receipts = transcript.receipts
      .filter((receipt) => receipt.circuitId === summary.circuitId)
      .sort((a, b) => a.contributionIndex - b.contributionIndex);
    if (receipts.length !== summary.totalContributions) {
      throw new Error(
        `Receipt count mismatch for ${summary.circuitId}: expected ${summary.totalContributions}, got ${receipts.length}.`,
      );
    }
    if (receipts.at(-1)?.chainHash !== summary.finalChainHash) {
      throw new Error(`Final recorded chain hash mismatch for ${summary.circuitId}.`);
    }

    const mpc = await parseMpcParams(finalZkey, {
      maxContributions: summary.totalContributions + 1,
    });
    if (mpc.contributions.length !== summary.totalContributions + 1) {
      throw new Error(
        `Embedded contribution count mismatch for ${summary.circuitId}; expected participant contributions plus one beacon contribution.`,
      );
    }
    for (let index = 0; index < receipts.length; index++) {
      if (receipts[index].contributionIndex !== index + 1) {
        throw new Error(`Non-contiguous receipt indexes for ${summary.circuitId}.`);
      }
      if (mpc.contributions[index].hash() !== receipts[index].serverContributionHash) {
        throw new Error(
          `Embedded contribution ${index + 1} does not match its receipt for ${summary.circuitId}.`,
        );
      }
    }

    const participantReceipts = localReceipts.filter(
      (receipt) => receipt.circuitId === summary.circuitId,
    );
    for (const local of participantReceipts) {
      const recorded = receipts.find(
        (receipt) =>
          receipt.participantId === local.participantId &&
          receipt.contributionIndex === local.contributionIndex,
      );
      if (!recorded) {
        throw new Error(
          `Local receipt is absent from the final transcript: ${local.circuitId} #${local.contributionIndex} (${local.participantId}).`,
        );
      }
      const fields: Array<keyof Receipt> = [
        "circuitId",
        "participantId",
        "contributionIndex",
        "contributionHash",
        "clientContributionHash",
        "serverContributionHash",
        "previousContributionHash",
        "chainHash",
        "timestamp",
      ];
      for (const field of fields) {
        if (local[field] !== recorded[field]) {
          throw new Error(
            `Local receipt field ${field} does not match the final transcript for ${local.circuitId} #${local.contributionIndex}.`,
          );
        }
      }
      if (
        mpc.contributions[local.contributionIndex - 1]?.hash() !==
        local.serverContributionHash
      ) {
        throw new Error(
          `Local receipt is not embedded at the claimed position in the final zkey: ${local.circuitId} #${local.contributionIndex}.`,
        );
      }
    }
    if (participantReceipts.length > 0) {
      console.log(
        `  ${participantReceipts.length} local participant receipt(s) verified.`,
      );
    }
    const beaconContribution = mpc.contributions.at(-1)?.hash();
    if (beaconContribution !== summary.finalContributionHash) {
      throw new Error(`Beacon contribution hash mismatch for ${summary.circuitId}.`);
    }
    console.log("  Participant chain and beacon contribution match transcript.\n");
  }

  const unknownReceipt = transcript.receipts.find(
    (receipt) => !seen.has(receipt.circuitId),
  );
  if (unknownReceipt) {
    throw new Error(
      `Receipt references a circuit not present in finalized data: ${unknownReceipt.circuitId}.`,
    );
  }

  const localUnknownCircuit = localReceipts.find(
    (receipt) => !seen.has(receipt.circuitId),
  );
  if (localUnknownCircuit) {
    throw new Error(
      `Local receipt references a circuit not present in finalized data: ${localUnknownCircuit.circuitId}.`,
    );
  }

  console.log("=== Verification passed ===");
  console.log(`Verified ${transcript.circuits.length} finalized circuit(s).`);
  if (localReceipts.length > 0) {
    console.log(`Verified ${localReceipts.length} local participant receipt(s).`);
  }

  // snarkjs/fastfile can leave file or async handles referenced after all
  // verification work has completed. Do not wait indefinitely for those
  // dependency-owned handles: reaching this point means every check passed.
  process.exit(0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nVerification failed: ${message}`);
  process.exitCode = 1;
});
