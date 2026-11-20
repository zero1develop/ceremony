import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";

import { env } from "./env";

const twitterClientId = process.env.TWITTER_CLIENT_ID?.trim();
const twitterClientSecret = process.env.TWITTER_CLIENT_SECRET?.trim();
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
