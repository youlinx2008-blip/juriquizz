import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { fulfillCheckoutSession } from "@/lib/payments";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { createServiceClient, serviceConfigured } from "@/lib/supabase/service";

/**
 * Retour de la page de paiement Stripe : l'accès s'ouvre tout de suite si le paiement est confirmé,
 * sans attendre la notification de Stripe (qui fera de même, sans effet en double).
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]{1,250}$/.test(sessionId) || !stripeConfigured() || !serviceConfigured()) {
    redirect("/tarifs");
  }
  const { data: payment } = await createServiceClient()
    .from("payments")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (!payment) redirect("/tarifs");

  try {
    await fulfillCheckoutSession(await getStripe().checkout.sessions.retrieve(sessionId));
  } catch (error) {
    // La notification de Stripe prendra le relais ; la page suivante attend la confirmation.
    console.error("Confirmation au retour du paiement impossible :", error);
  }
  redirect(`/paiement/merci?achat=${payment.id}`);
}
