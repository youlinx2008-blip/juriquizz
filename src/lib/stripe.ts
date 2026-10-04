import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Client Stripe (créé à la demande : la clé n'est pas nécessaire pour construire le site).
 * STRIPE_API_BASE permet de viser un faux serveur Stripe pendant les tests automatiques.
 */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Configuration manquante : STRIPE_SECRET_KEY.");
  const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
  client = new Stripe(key, {
    maxNetworkRetries: 2,
    telemetry: false,
    ...(base
      ? {
          host: base.hostname,
          port: Number(base.port || (base.protocol === "https:" ? 443 : 80)),
          protocol: base.protocol === "http:" ? ("http" as const) : ("https" as const),
        }
      : {}),
  });
  return client;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
