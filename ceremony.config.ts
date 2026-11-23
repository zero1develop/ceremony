import { defaultCopy } from "./src/copy";

export type {
  CeremonyCircuitConfig,
  CeremonyConfig,
  CeremonyCopy,
  CeremonyTierConfig,
  CircuitArtifactsConfig,
  ClientCeremonyConfig,
  ClientCircuitConfig,
  TierId,
} from "./src/types/ceremony";

import type {
  CeremonyConfig,
  ClientCeremonyConfig,
} from "./src/types/ceremony";

export function getCeremonyConfig(): CeremonyConfig {
  return ceremonyConfig;
}

export function getClientConfig(): ClientCeremonyConfig {
  const { circuits, ...rest } = ceremonyConfig;
  return {
    ...rest,
    circuits: circuits.map(({ artifacts, ...circuit }) => circuit),
  };
}

const CIRCUITS_DIR = "circuits";
const PTAU_PATH = `${CIRCUITS_DIR}/pot_final.ptau`;

export const ceremonyConfig: CeremonyConfig = {
  name: "zero1develop-ceremony",
  slug: "zero1develop-ceremony",
  description:
    "Contribute your randomness to strengthen the ceremony and improve system security.",
  targetContributions: 500,
  startDate: "2026-11-25T00:00:00Z",
  endDate: "2026-12-19T00:00:00Z",
  provenance: {
    circuitRepository: "https://github.com/zero1develop/circuits",
    circuitCommit: "e4c6fec248a952d2912fb802c1277551944f6106",
    circuitTag: "ceremony-input-v1",
    // This slot contains 2026-12-20 00:00:00 UTC. Its exact slot boundary is
    // 2026-12-19 23:59:59 UTC.
    beaconTime: "2026-12-20T00:00:00Z",
    beaconSlot: 15908398,
  },
  queueTimeoutSeconds: 300,
  // A front-runner must claim (fast liveness ping) within 30s of reaching the
  // front or be skipped as a no-show. ~3 pings at a 10s cadence.
  claimWindowSeconds: 30,
  // Two no-shows on a circuit → temporarily blocked from re-joining it...
  maxNoShows: 2,
  // ...for 15 minutes, then it auto-lifts.
  noShowCooldownSeconds: 900,
  verifyContributions: false,
  tiersEnabled: false,
  tiers: [

  ],
  circuits: [
    {
      id: "deposit",
      label: "Deposit",
      description: "Deposit funds into Zero1develop.",
      constraints: "2,061",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/deposit.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_1x1",
      label: "Transact 1×1",
      description: "Private transfer with 1 input note and 1 output note.",
      constraints: "27,802",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_1x1.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_1x2",
      label: "Transact 1×2",
      description: "Private transfer with 1 input note and 2 output notes.",
      constraints: "29,464",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_1x2.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_1x3",
      label: "Transact 1×3",
      description: "Private transfer with 1 input note and 3 output notes.",
      constraints: "31,134",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_1x3.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_1x4",
      label: "Transact 1×4",
      description: "Private transfer with 1 input note and 4 output notes.",
      constraints: "32,812",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_1x4.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_1x5",
      label: "Transact 1×5",
      description: "Private transfer with 1 input note and 5 output notes.",
      constraints: "34,498",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_1x5.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_2x1",
      label: "Transact 2×1",
      description: "Private transfer with 2 input notes and 1 output note.",
      constraints: "42,509",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_2x1.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_2x2",
      label: "Transact 2×2",
      description: "Private transfer with 2 input notes and 2 output notes.",
      constraints: "44,176",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_2x2.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_2x3",
      label: "Transact 2×3",
      description: "Private transfer with 2 input notes and 3 output notes.",
      constraints: "45,851",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_2x3.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_2x4",
      label: "Transact 2×4",
      description: "Private transfer with 2 input notes and 4 output notes.",
      constraints: "47,534",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_2x4.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_2x5",
      label: "Transact 2×5",
      description: "Private transfer with 2 input notes and 5 output notes.",
      constraints: "49,225",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_2x5.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_3x1",
      label: "Transact 3×1",
      description: "Private transfer with 3 input notes and 1 output note.",
      constraints: "57,215",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_3x1.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_3x2",
      label: "Transact 3×2",
      description: "Private transfer with 3 input notes and 2 output notes.",
      constraints: "58,886",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_3x2.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_3x3",
      label: "Transact 3×3",
      description: "Private transfer with 3 input notes and 3 output notes.",
      constraints: "60,565",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_3x3.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_3x4",
      label: "Transact 3×4",
      description: "Private transfer with 3 input notes and 4 output notes.",
      constraints: "62,252",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_3x4.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_3x5",
      label: "Transact 3×5",
      description: "Private transfer with 3 input notes and 5 output notes.",
      constraints: "63,947",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_3x5.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_4x1",
      label: "Transact 4×1",
      description: "Private transfer with 4 input notes and 1 output note.",
      constraints: "71,921",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_4x1.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_4x2",
      label: "Transact 4×2",
      description: "Private transfer with 4 input notes and 2 output notes.",
      constraints: "73,596",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_4x2.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_4x3",
      label: "Transact 4×3",
      description: "Private transfer with 4 input notes and 3 output notes.",
      constraints: "75,279",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_4x3.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_4x4",
      label: "Transact 4×4",
      description: "Private transfer with 4 input notes and 4 output notes.",
      constraints: "76,970",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_4x4.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_4x5",
      label: "Transact 4×5",
      description: "Private transfer with 4 input notes and 5 output notes.",
      constraints: "78,669",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_4x5.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_5x1",
      label: "Transact 5×1",
      description: "Private transfer with 5 input notes and 1 output note.",
      constraints: "86,627",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_5x1.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_5x2",
      label: "Transact 5×2",
      description: "Private transfer with 5 input notes and 2 output notes.",
      constraints: "88,306",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_5x2.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_5x3",
      label: "Transact 5×3",
      description: "Private transfer with 5 input notes and 3 output notes.",
      constraints: "89,993",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_5x3.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_5x4",
      label: "Transact 5×4",
      description: "Private transfer with 5 input notes and 4 output notes.",
      constraints: "91,688",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_5x4.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
    {
      id: "transact_5x5",
      label: "Transact 5×5",
      description: "Private transfer with 5 input notes and 5 output notes.",
      constraints: "93,391",
      targetContributions: 500,
      artifacts: {
        r1csPath: `${CIRCUITS_DIR}/transact_5x5.r1cs`,
        ptauPath: PTAU_PATH,
      },
    },
  ],
  branding: {
    shortName: "PP",
    accentColor: "#95C23A",
  },
  storage: {
    manifestPath: "ceremony:manifest",
    circuitStatePrefix: "ceremony:circuits",
    receiptsPath: "ceremony:receipts",
    participantContributionsPrefix: "ceremony:contributions:participants",
    participantsIndexPath: "ceremony:contributions:participants:index",
    zkeyPrefix: "zero1develop-ceremony/zkeys",
    noShowPrefix: "ceremony:noshow",
    runTokenPrefix: "ceremony:runtoken",
  },
  copy: defaultCopy,
};
