const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** 1200 → « 12,00 € » ; les montants ronds s'affichent sans décimales : « 12 € ». */
export function formatEuros(cents: number): string {
  if (cents % 100 === 0) return `${cents / 100} €`;
  return EUROS.format(cents / 100);
}

/** « 12 », « 12,5 », « 12,50 € » ou « 12.50 » vers des centimes ; null si la saisie n'est pas un prix. */
export function parseEuros(input: string): number | null {
  const match = /^(\d{1,5})(?:[.,](\d{1,2}))?$/.exec(input.replace(/\s|€/g, ""));
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0"));
}
