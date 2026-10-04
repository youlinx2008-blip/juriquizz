/**
 * Crée un code bêta depuis la ligne de commande (utile pour le tout premier compte,
 * avant qu'un administrateur existe).
 *
 *   npm run beta:code -- [--utilisations=300] [--libelle="Amphi L1"] [--code=AMPHI-L1-2026] [--fin-acces=2027-01-31]
 */
import { randomInt } from "node:crypto";
import { parisEndOfDay } from "../src/lib/dates";
import { createServiceClient, parseArgs } from "./lib/service-client";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `JQ-${part()}-${part()}`;
}

async function main() {
  const { values } = parseArgs(process.argv.slice(2));
  const usesMax = Number(values.get("utilisations") ?? 1);
  if (!Number.isInteger(usesMax) || usesMax < 1)
    throw new Error("--utilisations doit être un entier positif.");
  const code = (values.get("code") ?? randomCode()).trim().toUpperCase();
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(code) || code.length < 6) {
    throw new Error("Code invalide : 6 caractères au moins, lettres, chiffres et tirets.");
  }
  const accessEnd = values.get("fin-acces");
  const accessEndsAt = accessEnd ? parisEndOfDay(accessEnd) : null;
  if (accessEnd && !accessEndsAt) throw new Error("--fin-acces attend une date AAAA-MM-JJ.");

  const client = createServiceClient();
  const { error } = await client.from("beta_codes").insert({
    code,
    uses_max: usesMax,
    label: values.get("libelle") ?? "",
    access_ends_at: accessEndsAt,
  });
  if (error) throw new Error(error.code === "23505" ? "Ce code existe déjà." : error.message);
  console.log(`Code créé : ${code} (${usesMax} utilisation${usesMax > 1 ? "s" : ""})`);
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
