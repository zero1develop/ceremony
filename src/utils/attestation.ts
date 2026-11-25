// Publish the complete downloadable ceremony receipt as a public Gist on the
// contributor's own GitHub account. Returns the Gist's web URL.
//
// The GitHub token is never in the client: this posts to our own server route,
// which reads the token from the session JWT and calls GitHub. Throws
// "UNAUTHORIZED" when the session has no gist-scoped token (signed in before
// the scope was granted) so the caller can prompt a fresh sign-in.
export async function publishReceiptGist(options: {
  filename: string;
  content: string;
  ceremony: string;
  forceNew?: boolean;
}): Promise<string> {
  const response = await fetch("/api/ceremony/attestation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: options.filename,
      content: options.content,
      description: `${options.ceremony} ceremony receipt`,
      forceNew: options.forceNew ?? false,
    }),
  });
  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!response.ok) {
    throw new Error(`Gist creation failed (${response.status}).`);
  }
  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("Gist was created but no URL was returned.");
  }
  return data.url;
}

export async function getPublishedReceiptGist(): Promise<string | null> {
  const response = await fetch("/api/ceremony/attestation");
  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (!response.ok) {
    throw new Error(`Gist status check failed (${response.status}).`);
  }
  const data = (await response.json()) as { url?: string | null };
  return data.url ?? null;
}
