import type { Metadata } from "next";
import Link from "next/link";
import { SceneSetter } from "@/components/scene-setter";
import { OfferPrice } from "@/components/sales/offer-price";
import { getViewer } from "@/lib/auth";
import { discountLabel, getOffers, getPremiumExclusives, getQuote, type Quote } from "@/lib/data/offers";
import { formatDay } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { getSalesStatus } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Les pass JuriQuizz : un paiement unique, sans abonnement, avec une date de fin connue avant l’achat.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const [viewer, allOffers, sales, exclusives] = await Promise.all([
    getViewer(),
    getOffers(supabase),
    getSalesStatus(supabase),
    getPremiumExclusives(supabase),
  ]);
  // Le Premium n'apparaît qu'une fois en vente (deux exclusivités réellement disponibles au moins).
  const offers = allOffers.filter((offer) => offer.plan !== "pass_annee_premium" || offer.available);
  const premiumOnSale = offers.some((offer) => offer.plan === "pass_annee_premium");
  // Prix et couverture propres au compte connecté (réduction de parrainage, passage au Premium).
  const quotes = new Map<string, Quote>();
  if (viewer) {
    for (const quote of await Promise.all(offers.map((offer) => getQuote(supabase, offer.plan)))) {
      if (quote) quotes.set(quote.plan, quote);
    }
  }

  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">Tarifs</p>
        <h1 className="title small">Choisir un pass</h1>
        <p className="lead">
          Un paiement unique, sans abonnement : chaque pass donne accès à tous les quiz et à tous les cours en
          PDF{premiumOnSale ? " (hors exclusivités du Pass Année Premium)" : ""} jusqu&rsquo;à une date de fin
          indiquée avant l&rsquo;achat. L&rsquo;accès se ferme ensuite de lui-même.
        </p>
        {viewer?.hasAccess && viewer.accessEndsAt && (
          <p className="notice good" role="status" style={{ marginTop: 14 }}>
            Ton accès actuel court jusqu&rsquo;au {formatDay(viewer.accessEndsAt)}.
          </p>
        )}
        {!sales.open && (
          <div className="notice warn" role="status" style={{ marginTop: 14 }}>
            <p style={{ margin: 0 }}>La vente des pass ouvrira prochainement.</p>
            {viewer?.isAdmin && (
              <p style={{ margin: "6px 0 0" }}>
                Administration, il reste : {sales.missing.join(" ; ")}.{" "}
                <Link href="/admin/vente">Préparer la vente</Link>
              </p>
            )}
          </div>
        )}
      </section>

      <section className="paper" aria-label="Pass disponibles">
        {offers.map((offer) => {
          const quote = quotes.get(offer.plan);
          const covered = quote?.covered === true;
          const premium = offer.plan === "pass_annee_premium";
          return (
            <div className="row offer" key={offer.plan}>
              <div>
                <h2>
                  {offer.label}
                  {premium && <span className="pill premium title-pill">Exclusivités</span>}
                </h2>
                <p>{offer.description}</p>
                {premium && exclusives.length > 0 && (
                  <ul className="exclusives">
                    {exclusives.map((item) => (
                      <li key={item.id}>
                        {item.kind === "examen" ? "Examen blanc : " : ""}
                        {item.title} <span>({item.subjectTitle})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="meta">
                  {offer.endsAt === null ? (
                    <span>Dates des partiels bientôt annoncées</span>
                  ) : (
                    <span>
                      Fin de l&rsquo;accès{offer.duration === "jours" ? " pour un achat aujourd’hui" : ""} :{" "}
                      <strong>{formatDay(offer.endsAt)}</strong>
                    </span>
                  )}
                  {quote && quote.discountCents > 0 && !covered && (
                    <span className="personal-price">
                      Pour toi : <strong>{formatEuros(quote.priceCents)}</strong> (
                      {discountLabel(quote.discountReason).toLowerCase()}, −{formatEuros(quote.discountCents)}
                      )
                    </span>
                  )}
                </div>
              </div>
              <OfferPrice offer={offer} />
              <div className="row-actions">
                {!offer.available || !sales.open ? (
                  <span className="pill">Bientôt disponible</span>
                ) : covered ? (
                  <span className="pill">
                    {premium ? "Déjà inclus dans ton accès" : "Déjà couvert par ton accès"}
                  </span>
                ) : (
                  <Link className="btn primary" href={`/tarifs/${offer.slug}`}>
                    Choisir<span className="visually-hidden"> le {offer.label}</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="paper soon" aria-labelledby="tarifs-details">
        <h2 id="tarifs-details">Bon à savoir</h2>
        <ul>
          <li>
            Le paiement se fait par carte bancaire, auprès de Stripe ; JuriQuizz ne voit jamais ta carte.
          </li>
          <li>Aucun renouvellement automatique : rien ne sera prélevé après la date de fin.</li>
          <li>
            Chaque cours en PDF porte ton nom et ton adresse e-mail ; il se lit dans JuriQuizz et ne se
            télécharge pas.
          </li>
          <li>Un compte par personne, ouvert sur deux appareils à la fois au plus.</li>
          <li>
            Sans pass, un compte gratuit donne accès à un mini-quiz de démonstration, et chaque cours peut
            être feuilleté (sommaire et première page).
          </li>
        </ul>
        <p>
          JuriQuizz est un outil d&rsquo;entraînement : il ne remplace ni le cours, ni les manuels, et ne
          garantit aucun résultat. <Link href="/cgv">Conditions générales de vente</Link>.
        </p>
      </section>
    </>
  );
}
