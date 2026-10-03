"use client";

import { defaultPrefs, PREFS_STORAGE_KEY, sanitizePrefs, themeAttribute, type Prefs } from "@/lib/prefs";

/*
 * Stocke les préférences dans le navigateur et les applique à <html> (data-theme, data-decor).
 * Lu avec useSyncExternalStore : le rendu serveur utilise les valeurs par défaut, sans écart
 * d'hydratation.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let current: Prefs | null = null;
const SERVER_SNAPSHOT = defaultPrefs(false);

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function read(): Prefs {
  let raw: unknown = null;
  try {
    raw = JSON.parse(window.localStorage.getItem(PREFS_STORAGE_KEY) ?? "null");
  } catch {
    raw = null;
  }
  return sanitizePrefs(raw, prefersReducedMotion());
}

function apply(prefs: Prefs) {
  const root = document.documentElement;
  root.setAttribute("data-decor", prefs.decor);
  const theme = themeAttribute(prefs.theme);
  if (theme) root.setAttribute("data-theme", theme);
  else root.removeAttribute("data-theme");
}

export function getPrefs(): Prefs {
  if (!current) current = read();
  return current;
}

export function getServerPrefs(): Prefs {
  return SERVER_SNAPSHOT;
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  const next = sanitizePrefs({ ...getPrefs(), ...patch }, prefersReducedMotion());
  current = next;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible (navigation privée) : le réglage vaut pour cette page seulement.
  }
  apply(next);
  listeners.forEach((listener) => listener());
  return next;
}

export function subscribePrefs(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== PREFS_STORAGE_KEY) return;
    current = read();
    apply(current);
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
