import type { Database } from "@/lib/supabase/database.types";

export type Plan = Database["public"]["Enums"]["plan"];
/** Offres en vente (« beta » et « parrainage » sont des accès donnés, pas vendus). */
export type PassPlan = Exclude<Plan, "beta" | "parrainage">;

/** Adresse de la page de commande de chaque pass : /tarifs/mensuel, /tarifs/partiels… */
const SLUGS: Record<PassPlan, string> = {
  pass_mensuel: "mensuel",
  pass_partiels: "partiels",
  pass_annee: "annee",
  pass_annee_premium: "premium",
};

export const PASS_PLANS = Object.keys(SLUGS) as PassPlan[];

export function passSlug(plan: PassPlan): string {
  return SLUGS[plan];
}

export function planFromSlug(slug: string): PassPlan | null {
  return PASS_PLANS.find((plan) => SLUGS[plan] === slug) ?? null;
}

export function isPassPlan(value: unknown): value is PassPlan {
  return typeof value === "string" && (PASS_PLANS as string[]).includes(value);
}

const PLAN_NAMES: Record<Plan, string> = {
  beta: "Accès bêta",
  pass_mensuel: "Pass Mensuel",
  pass_partiels: "Pass Partiels",
  pass_annee: "Pass Année",
  pass_annee_premium: "Pass Année Premium",
  parrainage: "Jours offerts (parrainage)",
};

export function planName(plan: Plan): string {
  return PLAN_NAMES[plan];
}
