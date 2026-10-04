"use server";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createCheckoutSession, type Order } from "@/lib/payments";
import { isPassPlan, passSlug } from "@/lib/plans";
import { stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { serviceConfigured } from "@/lib/supabase/service";

export type CheckoutState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: { acceptCgv?: string; waiveWithdrawal?: string } };

const START_ERRORS: Record<string, string> = {
  "28000": "Connecte-toi pour acheter un pass.",
  "22023": "Les deux confirmations sont nécessaires avant le paiement.",
  "55000": "La vente n’est pas encore ouverte.",
  P0002: "Ce pass n’est pas en vente pour le moment.",
  JQ409: "Ton accès actuel va déjà au-delà de la fin de ce pass : il ne t’apporterait rien.",
  "54000": "Trop de tentatives de paiement en une heure : réessaie un peu plus tard.",
};

/** Commande d'un pass : consentements, achat enregistré (prix et date figés), puis page de paiement Stripe. */
export async function startCheckoutAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const plan = formData.get("plan");
  if (!isPassPlan(plan)) return { status: "error", message: "Offre inconnue." };

  const fields: { acceptCgv?: string; waiveWithdrawal?: string } = {};
  if (formData.get("acceptCgv") !== "on") fields.acceptCgv = "Coche cette case pour accepter les CGV.";
  if (formData.get("waiveWithdrawal") !== "on") {
    fields.waiveWithdrawal = "Coche cette case pour demander l’accès immédiat.";
  }
  if (fields.acceptCgv || fields.waiveWithdrawal) {
    return { status: "error", message: "Deux confirmations sont nécessaires avant le paiement.", fields };
  }

  const viewer = await getViewer();
  if (!viewer) redirect(`/connexion?suite=${encodeURIComponent(`/tarifs/${passSlug(plan)}`)}`);
  if (!stripeConfigured() || !serviceConfigured()) return { status: "error", message: START_ERRORS["55000"] };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_checkout", {
    p_plan: plan,
    p_accept_cgv: true,
    p_waive_withdrawal: true,
  });
  if (error) {
    return {
      status: "error",
      message: START_ERRORS[error.code] ?? "Le paiement n’a pas pu démarrer. Réessaie.",
    };
  }

  let paymentUrl: string;
  try {
    const session = await createCheckoutSession(data as Order, plan, {
      userId: viewer.userId,
      email: viewer.email,
    });
    if (!session.url) throw new Error("Adresse de la page de paiement absente.");
    const attached = await supabase.rpc("attach_checkout_session", {
      p_payment_id: (data as Order).payment_id,
      p_session_id: session.id,
    });
    if (attached.error) throw new Error(attached.error.message);
    paymentUrl = session.url;
  } catch (cause) {
    console.error("Création de la session de paiement impossible :", cause);
    return { status: "error", message: "Le paiement n’a pas pu démarrer. Réessaie dans un instant." };
  }
  redirect(paymentUrl);
}
