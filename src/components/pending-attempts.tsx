"use client";

import { useEffect } from "react";
import { submitAttemptAction } from "@/app/actions/quiz";
import { readPending, removePending } from "@/lib/quiz/pending";

/** Renvoie les parties enregistrées hors connexion, au chargement et au retour du réseau. */
export function PendingAttempts({ userId }: { userId: string }) {
  useEffect(() => {
    let running = false;
    async function flush() {
      if (running) return;
      running = true;
      try {
        for (const item of readPending()) {
          if (item.userId !== userId) continue;
          const result = await submitAttemptAction(item.input);
          if (result.ok || !result.retryable) removePending(item.id);
          else break;
        }
      } catch {
        // Toujours hors ligne : nouvel essai au prochain retour du réseau.
      } finally {
        running = false;
      }
    }
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [userId]);
  return null;
}
