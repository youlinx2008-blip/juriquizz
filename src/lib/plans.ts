import type { Database } from "@/lib/supabase/database.types";

export type Plan = Database["public"]["Enums"]["plan"];
export type PassPlan = Exclude<Plan, "beta">;

/** Adresse de la page de commande de chaque pass : /tarifs/mensuel, /tarifs/partiels, /tarifs/annee. */
const SLUGS: Record<PassPlan, string> = {
  pass_mensuel: "mensuel",
  pass_partiels: "partiels",
  pass_annee: "annee",
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
};

export function planName(plan: Plan): string {
  return PLAN_NAMES[plan];
}
