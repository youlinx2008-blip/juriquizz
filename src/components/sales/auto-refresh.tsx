"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recharge les données de la page à intervalle régulier (attente d'une confirmation de paiement). */
export function AutoRefresh({ everyMs, maxTimes }: { everyMs: number; maxTimes: number }) {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      if (count > maxTimes) {
        window.clearInterval(timer);
        return;
      }
      router.refresh();
    }, everyMs);
    return () => window.clearInterval(timer);
  }, [router, everyMs, maxTimes]);
  return null;
}
