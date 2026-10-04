/*
 * Parties terminées sans connexion réseau : gardées dans le navigateur, puis envoyées dès
 * que possible. Chaque partie est liée au compte qui l'a jouée.
 */
import type { AttemptInput } from "@/app/actions/quiz";

export type PendingAttempt = { id: string; userId: string; input: AttemptInput; at: string };

const KEY = "jq-pending-attempts";

export function readPending(): PendingAttempt[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? (value as PendingAttempt[]) : [];
  } catch {
    return [];
  }
}

function write(items: PendingAttempt[]) {
  try {
    if (items.length) window.localStorage.setItem(KEY, JSON.stringify(items));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Stockage indisponible : la partie ne pourra pas être renvoyée plus tard.
  }
}

export function queuePending(userId: string, input: AttemptInput): void {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  write([...readPending(), { id, userId, input, at: new Date().toISOString() }].slice(-20));
}

export function removePending(id: string): void {
  write(readPending().filter((item) => item.id !== id));
}
