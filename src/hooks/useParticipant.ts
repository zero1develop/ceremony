"use client";

import { useSession, signIn } from "next-auth/react";

export type AuthMethod = "github" | "twitter";

export function useParticipant() {
  const { data: session, status } = useSession();

  const participantId = session?.participantId ?? null;
  const participantName = session?.participantName ?? "";
  const isAuthenticated = status === "authenticated";

  const authenticate = (method: AuthMethod) => {
    void signIn(method);
  };

  return {
    participantId,
    participantName,
    isAuthenticated,
    authenticate,
  };
}
