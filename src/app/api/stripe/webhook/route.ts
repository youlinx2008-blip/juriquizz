import type Stripe from "stripe";
import { expireCheckoutSession, fulfillCheckoutSession, PaymentError, refundCharge } from "@/lib/payments";
import { getStripe, stripeConfigured } from "@/lib/stripe";

/**
 * Notifications de Stripe (signées) : paiement confirmé, session expirée, remboursement.
 * Une réponse autre que 2xx fait renvoyer la notification par Stripe pendant plusieurs jours.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret) {
    return Response.json({ error: "Paiement non configuré" }, { status: 503 });
  }
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      request.headers.get("stripe-signature") ?? "",
      secret,
    );
  } catch {
    return Response.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    let outcome = "ignore";
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        outcome = await fulfillCheckoutSession(event.data.object);
        break;
      case "checkout.session.expired":
        await expireCheckoutSession(event.data.object.id);
        outcome = "expire";
        break;
      case "charge.refunded":
        outcome = await refundCharge(event.data.object);
        break;
    }
    return Response.json({ received: true, outcome });
  } catch (error) {
    if (error instanceof PaymentError) {
      // Rien à espérer d'un nouvel envoi : l'erreur est consignée pour l'administration.
      console.error(`Notification Stripe ${event.id} (${event.type}) rejetée :`, error.message);
      return Response.json({ received: true, outcome: "rejete" });
    }
    console.error(`Notification Stripe ${event.id} (${event.type}) en échec :`, error);
    return Response.json({ error: "Traitement impossible pour l’instant" }, { status: 500 });
  }
}
