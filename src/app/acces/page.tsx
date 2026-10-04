import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { SceneSetter } from "@/components/scene-setter";
import { OfferPrice } from "@/components/sales/offer-price";
import { requireViewer, safeNext } from "@/lib/auth";
import { getOffers } from "@/lib/data/offers";
import { formatDay } from "@/lib/dates";
import { getSalesStatus } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";
import { RedeemForm } from "./redeem-form";

export const metadata: Metadata = { title: "Mon accès" };

/** Compte sans accès en cours (nouveau compte, pass terminé) : démonstration, pass, code bêta. */
export default async function AccessPage({ searchParams }: PageProps<"/acces">) {
  const { suite } = await searchParams;
  const next = safeNext(suite);
  const viewer = await requireViewer("/acces");
  if (viewer.hasAccess) redirect(next);
  const supabase = await createClient();
  const [offers, sales] = await Promise.all([getOffers(supabase), getSalesStatus(supabase)]);
  const available = sales.open ? offers.filter((offer) => offer.available) : [];

  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">Mon accès</p>
        {viewer.lastEndedAt ? (
          <>
            <h1 className="title small">Ton accès a pris fin</h1>
            <p className="lead">
              Il s&rsquo;est terminé le {formatDay(viewer.lastEndedAt)}, comme prévu : rien n&rsquo;a été
              prélevé. Ta progression est conservée et reprendra là où tu l&rsquo;as laissée.
            </p>
          </>
        ) : (
          <>
            <h1 className="title small">Bienvenue sur JuriQuizz</h1>
            <p className="lead">
              Ton compte est prêt. Essaie le mini-quiz de démonstration, feuillette l&rsquo;aperçu des cours,
              puis choisis un pass pour accéder à tous les quiz et à tous les cours en PDF.
            </p>
          </>
        )}
        <div className="actions">
          <Link className="btn primary" href="/demo">
            Essayer le mini-quiz
          </Link>
          <Link className="btn" href="/tarifs">
            Voir les pass
          </Link>
        </div>
      </section>

      {available.length > 0 && (
        <section className="paper" aria-labelledby="acces-pass">
          <h2 className="levels-title" id="acces-pass">
            Les pass
          </h2>
          {available.map((offer) => (
            <div className="row offer" key={offer.plan}>
              <div>
                <h3 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: "1.2rem" }}>{offer.label}</h3>
                {offer.endsAt && <p>Accès jusqu&rsquo;au {formatDay(offer.endsAt)}</p>}
              </div>
              <OfferPrice offer={offer} />
              <Link className="btn primary" href={`/tarifs/${offer.slug}`}>
                Choisir<span className="visually-hidden"> le {offer.label}</span>
              </Link>
            </div>
          ))}
        </section>
      )}

      <section className="paper pad" aria-labelledby="acces-code">
        <h2 id="acces-code" style={{ margin: "0 0 6px", fontSize: "1.1rem" }}>
          Un code d&rsquo;invitation ?
        </h2>
        <p style={{ margin: "0 0 14px" }}>
          Les testeurs de la bêta ont reçu un code : il ouvre l&rsquo;accès gratuitement jusqu&rsquo;à la fin
          de la bêta.
        </p>
        <RedeemForm next={next} />
        <form action={signOutAction} style={{ marginTop: 18 }}>
          <button className="btn small" type="submit">
            Se déconnecter
          </button>
        </form>
      </section>
    </>
  );
}
