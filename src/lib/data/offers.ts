import "server-only";
import { isPassPlan, passSlug, type PassPlan } from "@/lib/plans";
import type { ServerClient } from "@/lib/supabase/server";

export type Offer = {
  plan: PassPlan;
  slug: string;
  label: string;
  description: string;
  /** Prix du moment (prix de lancement compris), TTC, en centimes. */
  priceCents: number;
  regularPriceCents: number;
  /** Fin du prix de lancement, s'il s'applique. */
  promoUntil: string | null;
  /** Fin de l'accès pour un achat fait maintenant (null : dates des partiels pas encore connues). */
  endsAt: string | null;
  duration: "jours" | "session" | "annee";
  durationDays: number | null;
  available: boolean;
};

/** Offres en vente, avec le prix et la date de fin calculés par la base au moment de la lecture. */
export async function getOffers(supabase: ServerClient): Promise<Offer[]> {
  const { data, error } = await supabase.rpc("pass_offers");
  if (error) throw new Error(`Lecture des offres impossible : ${error.message}`);
  return (data ?? []).flatMap((row) => {
    if (!isPassPlan(row.plan)) return [];
    const duration = row.duration === "session" || row.duration === "annee" ? row.duration : "jours";
    return [
      {
        plan: row.plan,
        slug: passSlug(row.plan),
        label: row.label,
        description: row.description,
        priceCents: row.price_cents,
        regularPriceCents: row.regular_price_cents,
        promoUntil: row.promo_until ?? null,
        endsAt: row.ends_at ?? null,
        duration,
        durationDays: row.duration_days ?? null,
        available: row.available,
      },
    ];
  });
}

/** Durée d'un pass en clair, pour la page des tarifs. */
export function offerTerm(offer: Pick<Offer, "duration" | "durationDays">): string {
  if (offer.duration === "jours") return `${offer.durationDays ?? 30} jours à partir du paiement`;
  if (offer.duration === "session") return "Jusqu’à la fin des partiels de la session en cours";
  return "Jusqu’à la fin des partiels de l’année universitaire (les deux sessions)";
}
