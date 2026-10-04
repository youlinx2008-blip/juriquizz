import type { Metadata } from "next";
import Link from "next/link";
import { deleteExamSessionAction } from "@/app/actions/admin-vente";
import { BetaEndForm, ExamSessionForm, PlanForm } from "@/components/admin/sales-forms";
import { SceneSetter } from "@/components/scene-setter";
import { getOffers, getPremiumExclusives, offerTerm } from "@/lib/data/offers";
import { currentAcademicYear, formatDay, isPast, parisDateInput } from "@/lib/dates";
import { mentions } from "@/lib/legal-clauses";
import { isPassPlan } from "@/lib/plans";
import { getSalesStatus } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vente" };

function euros(cents: number | null): string {
  if (cents === null) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}

export default async function AdminSalesPage() {
  const supabase = await createClient();
  const [sales, offers, plansResult, sessionsResult, betaResult, exclusives, cgvResult] = await Promise.all([
    getSalesStatus(supabase),
    getOffers(supabase),
    supabase.from("plans").select("*").order("position"),
    supabase.from("exam_sessions").select("id, academic_year, label, ends_at").order("ends_at"),
    supabase.from("settings").select("beta_ends_at").maybeSingle(),
    getPremiumExclusives(supabase),
    supabase.from("legal_pages").select("body").eq("slug", "cgv").maybeSingle(),
  ]);
  const cgv = cgvResult.data?.body ?? "";
  if (plansResult.error) throw new Error(plansResult.error.message);
  const plans = plansResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const betaEnd = betaResult.data?.beta_ends_at ?? null;
  const missingDates = offers.some((offer) => offer.endsAt === null);
  // Année universitaire de la prochaine session : le Pass Année finit avec sa dernière session.
  const upcoming = sessions.filter((session) => !isPast(session.ends_at));
  const nextYear = upcoming[0]?.academic_year;
  const lonelyYear =
    nextYear && sessions.filter((session) => session.academic_year === nextYear).length === 1
      ? nextYear
      : null;

  return (
    <>
      <SceneSetter decor="chateau" />
      <section className="paper pad">
        <h1 className="title small">Vente</h1>
        {sales.open ? (
          <p className="notice good">La vente est ouverte : la page Tarifs propose les pass en vente.</p>
        ) : (
          <div className="notice warn">
            <p style={{ margin: 0 }}>La vente est fermée. Il reste :</p>
            <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
              {sales.missing.map((item) => (
                <li key={item}>
                  {item}
                  {item.startsWith("textes") && (
                    <>
                      {" "}
                      (<Link href="/admin/textes">Textes légaux</Link>)
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {missingDates && (
          <p className="notice warn" style={{ marginTop: 10 }}>
            Sans dates de partiels à venir, le Pass Partiels et le Pass Année ne peuvent pas être vendus (leur
            date de fin serait inconnue).
          </p>
        )}
        <p style={{ margin: "12px 0 0" }}>
          <Link href="/admin/achats">Voir les achats</Link> · <Link href="/tarifs">Voir la page Tarifs</Link>
        </p>
      </section>

      <section className="paper pad" aria-labelledby="vente-offres">
        <h2 id="vente-offres" style={{ marginTop: 0 }}>
          Offres
        </h2>
        <p className="fine" style={{ marginBottom: 14 }}>
          Prix TTC. Le prix de lancement s&rsquo;applique jusqu&rsquo;à la date indiquée (incluse), puis le
          prix habituel. Le prix et la date de fin sont figés au moment où l&rsquo;acheteur commence son
          paiement.
        </p>
        <div className="stack">
          {plans.map((plan) => {
            const offer = offers.find((item) => item.plan === plan.id);
            if (!isPassPlan(plan.id) || !offer) return null;
            return (
              <div
                key={plan.id}
                className="stack"
                style={{ paddingBottom: 14, borderBottom: "1px solid var(--line)" }}
              >
                <h3 style={{ margin: 0 }}>{plan.label}</h3>
                <p className="fine">
                  {offer.available && offer.endsAt
                    ? `En vente. Pour un achat aujourd’hui : ${formatDay(offer.endsAt)}.`
                    : offer.endsAt === null
                      ? "Pas en vente : aucune date de partiels à venir."
                      : plan.on_sale && plan.id === "pass_annee_premium"
                        ? `Pas en vente : il faut au moins deux exclusivités réellement disponibles (${exclusives.length} aujourd’hui).`
                        : "Pas en vente (case « En vente » décochée)."}
                </p>
                {plan.id === "pass_annee_premium" && (
                  <div className="fine">
                    <p style={{ margin: 0 }}>
                      Tout le Pass Année, plus les exclusivités : chapitres réservés avant leur publication
                      (page <Link href="/admin/matieres">Matières</Link>) et examens blancs Premium (page{" "}
                      <Link href="/admin/examens">Examens</Link>). Un acheteur du Pass Année en cours ne paie
                      que la différence. Exclusivités réellement disponibles : {exclusives.length}
                      {exclusives.length ? " :" : "."}
                    </p>
                    {exclusives.length > 0 && (
                      <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                        {exclusives.map((item) => (
                          <li key={item.id}>
                            {item.kind === "examen" ? "Examen blanc" : "Chapitre"} : {item.title} (
                            {item.subjectTitle})
                          </li>
                        ))}
                      </ul>
                    )}
                    {plan.on_sale && !mentions(cgv, "premium") && (
                      <p className="notice warn" style={{ marginTop: 8 }}>
                        Les CGV en vigueur ne mentionnent pas le Pass Année Premium : ajoute-le à
                        l&rsquo;article sur les offres (contenu, durée, déduction du Pass Année en cours)
                        depuis la page <Link href="/admin/textes">Textes légaux</Link> (clause proposée dans{" "}
                        <Link href="/admin/reglages">Réglages</Link>).
                      </p>
                    )}
                  </div>
                )}
                <PlanForm
                  plan={{
                    plan: plan.id,
                    label: plan.label,
                    description: plan.description,
                    price: euros(plan.price_cents),
                    promoPrice: euros(plan.promo_price_cents),
                    promoUntil: parisDateInput(plan.promo_until),
                    onSale: plan.on_sale,
                    duration: offerTerm(offer).toLowerCase(),
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="paper pad" aria-labelledby="vente-partiels">
        <h2 id="vente-partiels" style={{ marginTop: 0 }}>
          Dates des partiels
        </h2>
        <p className="fine" style={{ marginBottom: 12 }}>
          Le Pass Partiels court jusqu&rsquo;à la fin de la prochaine session ; le Pass Année jusqu&rsquo;à la
          fin de la dernière session de la même année universitaire. Indique le dernier jour de chaque session
          (accès jusqu&rsquo;à 23 h 59, heure de Paris).
        </p>
        {lonelyYear && (
          <p className="notice warn" style={{ marginBottom: 12 }}>
            Une seule session saisie pour {lonelyYear} : le Pass Année se terminerait avec elle. Ajoute la
            seconde session de l&rsquo;année.
          </p>
        )}
        {sessions.length > 0 && (
          <div
            className="table-wrap"
            role="region"
            aria-label="Sessions de partiels"
            tabIndex={0}
            style={{ marginBottom: 14 }}
          >
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Année</th>
                  <th scope="col">Session</th>
                  <th scope="col">Dernier jour</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.academic_year}</td>
                    <td>{session.label}</td>
                    <td className="num-cell">
                      {formatDay(session.ends_at)}
                      {isPast(session.ends_at) ? " (passée)" : ""}
                    </td>
                    <td>
                      <form action={deleteExamSessionAction}>
                        <input type="hidden" name="id" value={session.id} />
                        <button className="btn small" type="submit">
                          Supprimer<span className="visually-hidden"> : {session.label}</span>
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ExamSessionForm defaultYear={currentAcademicYear()} />
      </section>

      <section className="paper pad" aria-labelledby="vente-beta">
        <h2 id="vente-beta" style={{ marginTop: 0 }}>
          Fin de la bêta
        </h2>
        <p className="fine" style={{ marginBottom: 12 }}>
          {betaEnd
            ? `La bêta se termine le ${formatDay(betaEnd)} : aucun accès testeur ne va au-delà, même ouvert par un code créé ensuite.`
            : "Aucune date : les accès des testeurs n’ont pas de fin (sauf date propre à leur code)."}{" "}
          À cette date, les accès bêta et les codes d&rsquo;invitation s&rsquo;arrêtent ; les testeurs gardent
          leur compte et leur progression.
        </p>
        <BetaEndForm current={parisDateInput(betaEnd)} />
      </section>
    </>
  );
}
