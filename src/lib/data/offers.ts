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

/** Devis personnalisé : prix de l'offre, réduction éventuelle, et accès déjà couvert ou non. */
export type Quote = {
  plan: PassPlan;
  label: string;
  endsAt: string | null;
  available: boolean;
  regularPriceCents: number;
  /** Prix de l'offre au moment de la lecture (prix de lancement compris), avant réduction. */
  offerPriceCents: number;
  discountCents: number;
  /** « passage_premium » : Pass Année en cours déduit ; « parrainage » : premier achat d'un filleul. */
  discountReason: "passage_premium" | "parrainage" | null;
  /** Montant à payer. */
  priceCents: number;
  /** L'accès en cours couvre déjà toute la période (et les exclusivités pour le Premium). */
  covered: boolean;
};

type QuoteRow = {
  plan: string;
  label: string;
  ends_at: string | null;
  available: boolean;
  regular_price_cents: number;
  offer_price_cents: number;
  discount_cents: number;
  discount_reason: string | null;
  price_cents: number;
  covered: boolean;
};

export async function getQuote(supabase: ServerClient, plan: PassPlan): Promise<Quote | null> {
  const { data, error } = await supabase.rpc("quote_pass", { p_plan: plan });
  if (error) throw new Error(`Calcul du prix impossible : ${error.message}`);
  if (!data) return null;
  const row = data as unknown as QuoteRow;
  return {
    plan,
    label: row.label,
    endsAt: row.ends_at ?? null,
    available: row.available,
    regularPriceCents: row.regular_price_cents,
    offerPriceCents: row.offer_price_cents,
    discountCents: row.discount_cents,
    discountReason:
      row.discount_reason === "passage_premium" || row.discount_reason === "parrainage"
        ? row.discount_reason
        : null,
    priceCents: row.price_cents,
    covered: row.covered,
  };
}

/** Motif d'une réduction, en clair. */
export function discountLabel(reason: Quote["discountReason"]): string {
  if (reason === "passage_premium") return "Pass Année en cours déduit";
  if (reason === "parrainage") return "Réduction de parrainage";
  return "Réduction";
}

export type PremiumExclusive = {
  kind: "chapitre" | "examen";
  id: string;
  title: string;
  subjectTitle: string;
};

/** Exclusivités Premium réellement disponibles (chapitres et examens publiés, avec du contenu relu). */
export async function getPremiumExclusives(supabase: ServerClient): Promise<PremiumExclusive[]> {
  const { data, error } = await supabase.rpc("premium_exclusives");
  if (error) throw new Error(`Lecture des exclusivités impossible : ${error.message}`);
  return (data ?? []).map((row) => ({
    kind: row.kind === "examen" ? "examen" : "chapitre",
    id: row.item_id,
    title: row.title,
    subjectTitle: row.subject_title,
  }));
}
