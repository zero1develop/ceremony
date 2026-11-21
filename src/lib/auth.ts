import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
import { HttpsProxyAgent } from "https-proxy-agent";
import { request as httpsRequest } from "node:https";

import { env } from "./env";

const twitterClientId = process.env.TWITTER_CLIENT_ID?.trim();
const twitterClientSecret = process.env.TWITTER_CLIENT_SECRET?.trim();
const oauthProxyUrl = process.env.OAUTH_PROXY_URL?.trim();
const oauthProxyAgent = oauthProxyUrl
  ? new HttpsProxyAgent(oauthProxyUrl)
  : undefined;
if (Boolean(twitterClientId) !== Boolean(twitterClientSecret)) {
  throw new Error(
    "TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must either both be set or both be omitted.",
  );
}

const providers: NextAuthOptions["providers"] = [
  GitHubProvider({
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    // GitHub includes RFC 9207's `iss` parameter in OAuth callbacks.
    issuer: "https://github.com/login/oauth",
    // Gist publishing is optional and the token stays in the encrypted JWT.
    authorization: { params: { scope: "read:user gist" } },
  }),
];

if (twitterClientId && twitterClientSecret) {
  providers.push(
    TwitterProvider({
      clientId: twitterClientId,
      clientSecret: twitterClientSecret,
      version: "2.0",
      token: {
        url: "https://api.twitter.com/2/oauth2/token",
        async request({ params, checks, provider }) {
          if (!checks.code_verifier) {
            throw new Error("Missing PKCE code verifier for X OAuth callback.");
          }
          const form = new URLSearchParams({
            grant_type: "authorization_code",
            code: String(params.code),
            redirect_uri: provider.callbackUrl,
            code_verifier: checks.code_verifier,
            client_id: twitterClientId,
          });
          const basicAuth = Buffer.from(
            `${encodeURIComponent(twitterClientId)}:${encodeURIComponent(twitterClientSecret)}`,
          ).toString("base64");
          const tokens = await twitterRequest<{
            access_token: string;
            token_type: string;
            expires_in?: number;
            scope?: string;
          }>("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
              Accept: "application/json",
              Authorization: `Basic ${basicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
              "Content-Length": String(Buffer.byteLength(form.toString())),
            },
            body: form.toString(),
          });
          return { tokens };
        },
      },
      userinfo: {
        url: "https://api.twitter.com/2/users/me",
        async request({ tokens }) {
          return (await twitterRequest<{ data: TwitterProfile }>(
            "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
            {
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${tokens.access_token}`,
              },
            },
          )) as never;
        },
      },
      // Identity-only login: no posting and no long-lived refresh token.
      authorization: {
        params: { scope: "users.read tweet.read" },
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, account, profile }) {
      if (profile && account?.provider === "github") {
        const github = profile as {
          id?: number;
          login?: string;
          name?: string;
        };
        if (github.id !== undefined) {
          token.participantId = `github:${github.id}`;
          token.participantName = github.login ?? github.name ?? "";
          token.authProvider = "github";
        }
      } else if (profile && account?.provider === "twitter") {
        const twitter = profile as {
          data?: { id?: string; username?: string; name?: string };
        };
        if (twitter.data?.id) {
          token.participantId = `twitter:${twitter.data.id}`;
          token.participantName =
            twitter.data.username ?? twitter.data.name ?? "";
          token.authProvider = "twitter";
        }
      }

      // Only GitHub tokens have the Gist scope used by the attestation route.
      if (account?.provider === "github" && account.access_token) {
        token.accessToken = account.access_token;
      } else if (account?.provider === "twitter") {
        delete token.accessToken;
      }
      return token;
    },
    session({ session, token }) {
      session.participantId = token.participantId as string;
      session.participantName = token.participantName as string;
      session.authProvider = token.authProvider as "github" | "twitter";
      return session;
    },
  },
};

interface TwitterProfile {
  id: string;
  name?: string;
  username?: string;
  profile_image_url?: string;
}

function twitterRequest<T>(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: options.method ?? "GET",
        headers: options.headers,
        agent: oauthProxyAgent,
        timeout: 15_000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          let parsed: unknown;
          try {
            parsed = JSON.parse(body);
          } catch {
            reject(
              new Error(
                `X OAuth returned HTTP ${response.statusCode} with a non-JSON response.`,
              ),
            );
            return;
          }
          if ((response.statusCode ?? 500) < 200 || (response.statusCode ?? 500) >= 300) {
            reject(
              new Error(
                `X OAuth returned HTTP ${response.statusCode}: ${JSON.stringify(parsed)}`,
              ),
            );
            return;
          }
          resolve(parsed as T);
        });
      },
    );
    request.on("timeout", () =>
      request.destroy(new Error("X OAuth request timed out after 15000ms")),
    );
    request.on("error", reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}
