import "server-only";
import { stripeConfigured } from "@/lib/stripe";
import { serviceConfigured } from "@/lib/supabase/service";
import type { ServerClient } from "@/lib/supabase/server";

export type SalesStatus = { open: boolean; missing: string[] };

/**
 * La vente n'ouvre que si tout est prêt : paiement configuré et textes légaux complets
 * (plus aucun passage « [À COMPLÉTER » dans les CGU, CGV, mentions légales, confidentialité).
 */
export async function getSalesStatus(supabase: ServerClient): Promise<SalesStatus> {
  const missing: string[] = [];
  if (!stripeConfigured()) missing.push("paiement Stripe non configuré");
  if (!serviceConfigured()) missing.push("clé secrète Supabase absente du serveur");
  const { data: legalReady } = await supabase.rpc("legal_ready");
  if (!legalReady) missing.push("textes légaux à compléter");
  return { open: missing.length === 0, missing };
}
