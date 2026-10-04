/** « 30 min », « 1 h 30 », « 2 h » */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, "0")}` : `${minutes / 60} h`;
}

/** Temps restant affiché par le chronomètre : « 29:59 », « 1:05:00 » ; jamais négatif. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** Temps restant en toutes lettres, pour les lecteurs d'écran : « 12 minutes », « moins d'une minute ». */
export function spokenRemaining(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "moins d’une minute";
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/** Note sur 20, arrondie au demi-point, comme aux partiels. */
export function onTwenty(score: number, total: number): string {
  if (total <= 0) return "0";
  const value = Math.round((score / total) * 40) / 2;
  return value.toLocaleString("fr-FR");
}
