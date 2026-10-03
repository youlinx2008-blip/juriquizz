"use client";

import { useEffect } from "react";

/** Enregistre le service worker (installation sur l'écran d'accueil, page hors ligne). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Sans service worker, le site fonctionne normalement.
    });
  }, []);
  return null;
}
