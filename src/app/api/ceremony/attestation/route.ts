import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";
import { getCeremonyConfig } from "@/lib/ceremony-config";
import { getJson, setJson } from "@/lib/kv-store";

// Publish a contributor's complete receipt Gist server-side. The GitHub access token
// lives only in the encrypted, httpOnly session JWT — read here via getToken,
// never exposed to client JavaScript. This keeps a write-scoped token off the
// page, so an XSS cannot steal it. Browser flow only: the CLI holds a Caburé
// JWT (no GitHub token) and publishes its attestation manually.

// A full run contains one receipt per circuit. Keep a generous but bounded cap
// so legitimate runs fit while this endpoint cannot create arbitrarily large Gists.
const MAX_CONTENT_BYTES = 128 * 1024;

function gistKey(participantId: string): string {
  return `${getCeremonyConfig().storage.manifestPath}:receipt-gist:${participantId}`;
}

async function githubIdentity(request: NextRequest): Promise<{
  accessToken: string;
  participantId: string;
} | null> {
  const token = await getToken({ req: request, secret: env.NEXTAUTH_SECRET });
  if (
    token?.authProvider !== "github" ||
    typeof token.accessToken !== "string" ||
    typeof token.participantId !== "string"
  ) {
    return null;
  }
  return { accessToken: token.accessToken, participantId: token.participantId };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const identity = await githubIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "GitHub sign-in required." }, { status: 401 });
  }
  const published = await getJson<{ url: string }>(gistKey(identity.participantId));
  return NextResponse.json({ url: published?.url ?? null });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const identity = await githubIdentity(request);
  if (!identity) {
    return NextResponse.json(
      { error: "Sign in with GitHub (granting Gist access) to publish." },
      { status: 401 },
    );
  }

  const existing = await getJson<{ url: string }>(gistKey(identity.participantId));
  if (existing?.url) return NextResponse.json({ url: existing.url });

  let body: { filename?: unknown; content?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { filename, content, description } = body;
  if (
    typeof filename !== "string" ||
    typeof content !== "string" ||
    typeof description !== "string" ||
    filename.length === 0 ||
    content.length === 0
  ) {
    return NextResponse.json(
      { error: "filename, content and description are required" },
      { status: 400 },
    );
  }
  if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
    return NextResponse.json({ error: "Receipt too large" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${identity.accessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        public: true,
        files: { [filename]: { content } },
      }),
      // Fail fast on a stalled upstream instead of holding the request (and the
      // client's "Publishing…" state) open indefinitely. Trips the catch below.
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Network-layer failure (DNS, timeout, connection reset). Return a
    // controlled error instead of letting it surface as a raw 500.
    return NextResponse.json(
      { error: "Could not reach GitHub to publish the Gist." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `GitHub rejected the Gist (${response.status}).` },
      { status: 502 },
    );
  }

  const data = (await response.json()) as { html_url?: string };
  if (!data.html_url) {
    return NextResponse.json(
      { error: "Gist created but GitHub returned no URL." },
      { status: 502 },
    );
  }
  await setJson(gistKey(identity.participantId), { url: data.html_url });
  return NextResponse.json({ url: data.html_url });
}
