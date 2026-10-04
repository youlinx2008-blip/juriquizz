import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SceneSetter } from "@/components/scene-setter";
import { requireViewer } from "@/lib/auth";
import { getOffers, offerTerm } from "@/lib/data/offers";
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
  const [offers, sales] = await Promise.all([getOffers(supabase), getSalesStatus(supabase)]);
  const offer = offers.find((item) => item.plan === plan);
  if (!offer) notFound();

  // L'administration garde la possibilité d'acheter (paiements de test).
  const unlimited = viewer.hasAccess && viewer.accessEndsAt === null && !viewer.isAdmin;
  const covered =
    unlimited ||
    (viewer.accessEndsAt !== null &&
      offer.endsAt !== null &&
      Date.parse(viewer.accessEndsAt) >= Date.parse(offer.endsAt));
  const blocker = !sales.open
    ? "La vente des pass ouvrira prochainement."
    : !offer.available || offer.endsAt === null
      ? "Ce pass n’est pas en vente pour le moment."
      : covered
        ? viewer.accessEndsAt
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
          <dd>Tous les quiz et tous les cours en PDF disponibles</dd>
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
            {formatEuros(offer.priceCents)} TTC, paiement unique
            {offer.promoUntil && offer.priceCents < offer.regularPriceCents
              ? ` (prix de lancement jusqu’au ${formatDay(offer.promoUntil)}, puis ${formatEuros(offer.regularPriceCents)})`
              : ""}
          </dd>
          <dt>Compte</dt>
          <dd>{viewer.email}</dd>
        </dl>
        <p className="fine" style={{ marginTop: 12 }}>
          Aucun renouvellement automatique : l&rsquo;accès se ferme de lui-même à la date de fin.
          {viewer.hasAccess && viewer.accessEndsAt && !covered
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
          <OrderForm plan={plan} priceLabel={formatEuros(offer.priceCents)} />
        )}
      </section>
    </>
  );
}
