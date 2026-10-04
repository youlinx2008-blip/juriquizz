import "server-only";
import type Stripe from "stripe";
import { formatDay } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { passSlug, planName, type PassPlan } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";

/** Achat enregistré par start_checkout : prix (réduction déduite) et date de fin figés avant le paiement. */
export type Order = {
  payment_id: string;
  amount_cents: number;
  label: string;
  ends_at: string;
  discount_cents?: number;
  discount_reason?: string | null;
};

/** Ce que couvre le pass, tel qu'annoncé sur la page de paiement. */
function orderDescription(order: Order, plan: PassPlan, premiumExclusives: boolean): string {
  const endsOn = formatDay(order.ends_at);
  const content =
    plan === "pass_annee_premium"
      ? "Accès à tous les quiz et cours en PDF disponibles, exclusivités Premium comprises"
      : premiumExclusives
        ? "Accès à tous les quiz et cours en PDF disponibles, hors exclusivités Premium"
        : "Accès à tous les quiz et cours en PDF disponibles";
  const discount = order.discount_cents
    ? order.discount_reason === "passage_premium"
      ? ` Pass Année en cours déduit (${formatEuros(order.discount_cents)}).`
      : ` Réduction de parrainage déduite (${formatEuros(order.discount_cents)}).`
    : "";
  return `${content}, jusqu’au ${endsOn} inclus. Paiement unique, sans renouvellement.${discount}`;
}

/** Erreur définitive (achat incohérent, inconnu…) : la renvoyer à Stripe ne servirait à rien. */
export class PaymentError extends Error {}

const PERMANENT_CODES = new Set(["22023", "P0002", "55000"]);

/** Page de paiement Stripe pour un achat ; une seule session par achat (clé d'idempotence). */
export async function createCheckoutSession(
  order: Order,
  plan: PassPlan,
  buyer: { userId: string; email: string | null },
  premiumExclusives = false,
): Promise<Stripe.Checkout.Session> {
  const endsOn = formatDay(order.ends_at);
  const name = planName(plan);
  return getStripe().checkout.sessions.create(
    {
      mode: "payment",
      // Carte bancaire (et portefeuilles adossés à une carte) : paiement immédiat, comme l'annoncent les CGV.
      allowed_payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: order.amount_cents,
            product_data: {
              name: `JuriQuizz, ${name}`,
              description: orderDescription(order, plan, premiumExclusives),
            },
          },
        },
      ],
      client_reference_id: buyer.userId,
      ...(buyer.email ? { customer_email: buyer.email } : {}),
      metadata: { payment_id: order.payment_id, user_id: buyer.userId, plan },
      payment_intent_data: {
        description: `JuriQuizz, ${name} (accès jusqu’au ${endsOn}). Exécution immédiate demandée, renonciation au droit de rétractation (art. L221-28, 13°, du Code de la consommation).`,
        metadata: { payment_id: order.payment_id, plan },
        ...(buyer.email ? { receipt_email: buyer.email } : {}),
      },
      custom_text: {
        submit: {
          message:
            "Accès ouvert dès le paiement : tu as demandé l’exécution immédiate et renoncé au droit de rétractation.",
        },
      },
      locale: "fr",
      submit_type: "pay",
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      success_url: `${siteUrl()}/paiement/retour?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/tarifs/${passSlug(plan)}?annule=1`,
    },
    { idempotencyKey: `checkout-${order.payment_id}` },
  );
}

function stripeId(value: string | { id: string } | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function fail(action: string, error: { code?: string; message: string }): never {
  const message = `${action} : ${error.message}`;
  throw PERMANENT_CODES.has(error.code ?? "") ? new PaymentError(message) : new Error(message);
}

/**
 * Ouvre l'accès d'un achat payé. Appelée par le webhook et au retour de la page de paiement :
 * la base ignore les doublons.
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<string> {
  if (session.payment_status !== "paid") return "non_paye";
  const paymentId = session.metadata?.payment_id;
  const paymentIntent = stripeId(session.payment_intent);
  if (!paymentId || !paymentIntent || session.amount_total === null || !session.currency) {
    throw new PaymentError(`Session ${session.id} incomplète`);
  }
  const { data, error } = await createServiceClient().rpc("fulfill_payment", {
    p_payment_id: paymentId,
    p_session_id: session.id,
    p_payment_intent: paymentIntent,
    p_amount: session.amount_total,
    p_currency: session.currency,
  });
  if (error) fail("Confirmation du paiement", error);
  return (data as { status: string }).status;
}

/** Session abandonnée : l'achat passe à « expiré ». */
export async function expireCheckoutSession(sessionId: string): Promise<void> {
  const { error } = await createServiceClient().rpc("expire_checkout", { p_session_id: sessionId });
  if (error) fail("Expiration de la session", error);
}

/** Remboursement total : l'accès se ferme. Un remboursement partiel (geste commercial) le laisse ouvert. */
export async function refundCharge(charge: Stripe.Charge): Promise<string> {
  const paymentIntent = stripeId(charge.payment_intent);
  if (!charge.refunded || !paymentIntent) return "ignore";
  const { data, error } = await createServiceClient().rpc("refund_payment", {
    p_payment_intent: paymentIntent,
  });
  if (error) fail("Remboursement", error);
  return (data as { status: string }).status;
}
