/** Décalage horaire de Paris (en minutes) à un instant donné : 60 en hiver, 120 en été. */
export function parisOffsetMinutes(instant: number): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "shortOffset" })
    .formatToParts(new Date(instant))
    .find((p) => p.type === "timeZoneName")?.value;
  const match = part?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}

/** « 2027-01-31 » vers l'instant 31 janvier 2027 à 23 h 59 min 59 s, heure de Paris. */
export function parisEndOfDay(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const asUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59);
  if (Number.isNaN(asUtc)) return null;
  return new Date(asUtc - parisOffsetMinutes(asUtc) * 60_000).toISOString();
}

const DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});
const DAY_TIME = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

export function formatDay(iso: string): string {
  return DAY.format(new Date(iso));
}

export function formatDayTime(iso: string): string {
  return DAY_TIME.format(new Date(iso));
}

/** Vrai si l'instant donné est déjà passé. */
export function isPast(iso: string | null): boolean {
  return iso !== null && Date.parse(iso) <= Date.now();
}

/** Instant situé `days` jours avant maintenant. */
export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Année universitaire en cours, « 2026-2027 » (elle commence en septembre). */
export function currentAcademicYear(at = new Date()): string {
  const year = Number(at.toLocaleDateString("en-CA", { timeZone: "Europe/Paris", year: "numeric" }));
  const month = Number(at.toLocaleDateString("en-CA", { timeZone: "Europe/Paris", month: "numeric" }));
  const start = month >= 9 ? year : year - 1;
  return `${start}-${start + 1}`;
}

/** Instant ISO vers « 2027-01-31 » (jour à Paris), pour préremplir un champ date. */
export function parisDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}
