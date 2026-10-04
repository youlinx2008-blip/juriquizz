"use client";

import { useEffect } from "react";

/** La copie est rendue : son brouillon, gardé dans le navigateur pendant l'épreuve, est effacé. */
export function ForgetExamDraft({ attemptId }: { attemptId: string }) {
  useEffect(() => {
    try {
      localStorage.removeItem(`jq-examen-${attemptId}`);
    } catch {
      // Stockage indisponible : rien à effacer.
    }
  }, [attemptId]);
  return null;
}
