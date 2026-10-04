"use client";

import { createContext, useContext } from "react";

/** Nonce de la requête (politique de sécurité du contenu), pour les scripts en ligne des composants client. */
const NonceContext = createContext<string | undefined>(undefined);

export function NonceProvider({ nonce, children }: { nonce: string | undefined; children: React.ReactNode }) {
  return <NonceContext value={nonce}>{children}</NonceContext>;
}

export function useNonce(): string | undefined {
  return useContext(NonceContext);
}
