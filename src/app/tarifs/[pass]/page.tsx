import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SceneSetter } from "@/components/scene-setter";
import { requireViewer } from "@/lib/auth";
import { discountLabel, getOffers, getPremiumExclusives, getQuote, offerTerm } from "@/lib/data/offers";
import { formatDay } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { planFromSlug, planName } from "@/lib/plans";
import { getSalesStatus } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "./order-form";

export async function generateMetadata({ params }: PageProps<"/tarifs/[pass]">): Promise<Metadata> {
  const plan = planFromSlug((await params).pass);
  return { title: plan ? `Commander le ${planName(plan)}` : "Commander" };
}

export default async function OrderPage({ params, searchParams }: PageProps<"/tarifs/[pass]">) {
  const { pass } = await params;
  const { annule } = await searchParams;
  const plan = planFromSlug(pass);
  if (!plan) notFound();
  const viewer = await requireViewer(`/tarifs/${pass}`);
  const supabase = await createClient();
  const [offers, sales, quote, exclusives] = await Promise.all([
    getOffers(supabase),
    getSalesStatus(supabase),
    getQuote(supabase, plan),
    getPremiumExclusives(supabase),
  ]);
  const offer = offers.find((item) => item.plan === plan);
  if (!offer || !quote) notFound();
  const premium = plan === "pass_annee_premium";

  const covered = quote.covered;
  const blocker = !sales.open
    ? "La vente des pass ouvrira prochainement."
    : !offer.available || offer.endsAt === null
      ? "Ce pass n’est pas en vente pour le moment."
      : covered
        ? premium
          ? "Ton accès comprend déjà les exclusivités Premium jusqu’à la fin de ce pass : il ne t’apporterait rien."
          : viewer.accessEndsAt
            ? `Ton accès actuel court jusqu’au ${formatDay(viewer.accessEndsAt)}, au-delà de la fin de ce pass : il ne t’apporterait rien.`
            : "Ton accès actuel n’a pas de date de fin : ce pass ne t’apporterait rien."
        : null;

  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <Link className="chip" href="/tarifs">
          Tous les pass
        </Link>
        <p className="course" style={{ marginTop: 14 }}>
          Commande
        </p>
        <h1 className="title small">{offer.label}</h1>
        {annule === "1" && (
          <p className="notice" role="status" style={{ marginBottom: 14 }}>
            Paiement annulé : aucun montant n&rsquo;a été débité.
          </p>
        )}
        <dl className="order-summary">
          <dt>Contenu</dt>
          <dd>
            {premium
              ? "Tous les quiz et tous les cours en PDF disponibles, plus les exclusivités Premium"
              : exclusives.length > 0
                ? "Tous les quiz et tous les cours en PDF disponibles, hors exclusivités Premium"
                : "Tous les quiz et tous les cours en PDF disponibles"}
            {premium && exclusives.length > 0 && (
              <ul className="exclusives" style={{ fontWeight: 400 }}>
                {exclusives.map((item) => (
                  <li key={item.id}>
                    {item.kind === "examen" ? "Examen blanc : " : ""}
                    {item.title} <span>({item.subjectTitle})</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
          <dt>Durée</dt>
          <dd>{offerTerm(offer)}</dd>
          {offer.endsAt && (
            <>
              <dt>Fin de l&rsquo;accès</dt>
              <dd>{formatDay(offer.endsAt)} inclus</dd>
            </>
          )}
          <dt>Prix</dt>
          <dd>
            {formatEuros(quote.offerPriceCents)} TTC, paiement unique
            {offer.promoUntil && offer.priceCents < offer.regularPriceCents
              ? ` (prix de lancement jusqu’au ${formatDay(offer.promoUntil)}, puis ${formatEuros(offer.regularPriceCents)})`
              : ""}
          </dd>
          {quote.discountCents > 0 && !covered && (
            <>
              <dt>{discountLabel(quote.discountReason)}</dt>
              <dd>−{formatEuros(quote.discountCents)}</dd>
              <dt>À payer</dt>
              <dd>{formatEuros(quote.priceCents)} TTC</dd>
            </>
          )}
          <dt>Compte</dt>
          <dd>{viewer.email}</dd>
        </dl>
        <p className="fine" style={{ marginTop: 12 }}>
          Aucun renouvellement automatique : l&rsquo;accès se ferme de lui-même à la date de fin.
          {quote.discountReason === "passage_premium"
            ? " Le Premium s’ajoute à ton Pass Année dès le paiement, jusqu’à la même date de fin : le montant déjà payé est déduit."
            : viewer.hasAccess && viewer.accessEndsAt && !covered
              ? ` Le pass prend effet dès le paiement ; il ne prolonge pas ton accès actuel (jusqu’au ${formatDay(viewer.accessEndsAt)}).`
              : ""}
        </p>
      </section>

      <section className="paper pad" aria-labelledby="paiement-titre">
        <h2 id="paiement-titre" style={{ margin: "0 0 12px", fontSize: "1.1rem" }}>
          Paiement
        </h2>
        {blocker ? (
          <>
            <p className="notice warn" role="status">
              {blocker}
            </p>
            <div className="actions">
              <Link className="btn" href={viewer.hasAccess ? "/cours" : "/tarifs"}>
                {viewer.hasAccess ? "Retour aux cours" : "Voir les autres pass"}
              </Link>
            </div>
          </>
        ) : (
          <OrderForm plan={plan} priceLabel={formatEuros(quote.priceCents)} />
        )}
      </section>
    </>
  );
}
