import Link from "next/link";
import { Emblem } from "@/components/emblem";
import { SceneSetter } from "@/components/scene-setter";
import { getViewer } from "@/lib/auth";
import { getNewChapterIds, getSubjects } from "@/lib/data/catalog";
import { getDocuments } from "@/lib/data/documents";
import { getOffers } from "@/lib/data/offers";
import { HOME_DECOR } from "@/lib/decors/registry";
import { LEVELS } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { compte } = await searchParams;
  const viewer = await getViewer();
  const supabase = await createClient();
  const [subjects, news, offers, settings, exams] = await Promise.all([
    getSubjects(supabase),
    getNewChapterIds(supabase),
    getOffers(supabase),
    supabase.from("settings").select("levels_unlock").maybeSingle(),
    supabase.from("mock_exams").select("id", { count: "exact", head: true }).eq("visible", true),
  ]);
  const published = subjects.filter((subject) => subject.visible);
  const documents = await getDocuments(
    supabase,
    published.flatMap((subject) => subject.chapters.map((chapter) => chapter.id)),
  );
  const premiumOnSale = offers.some((offer) => offer.plan === "pass_annee_premium" && offer.available);
  const levelsUnlock = settings.data?.levels_unlock ?? true;
  const hasExams = (exams.count ?? 0) > 0;

  return (
    <>
      <SceneSetter decor={HOME_DECOR} />
      {compte === "supprime" && (
        <p className="paper notice good" role="status" style={{ marginBottom: 14 }}>
          Ton compte et toutes ses données ont été supprimés.
        </p>
      )}
      <section className="paper">
        <div className="pad hero">
          <span className="emblem" aria-hidden="true">
            <Emblem decor={HOME_DECOR} />
          </span>
          <p className="course">Révisions de L1 de droit</p>
          <h1 className="title">Des quiz pour chaque chapitre du cours</h1>
          <p className="lead">
            Trois niveaux par chapitre (facile, intermédiaire, confirmé), une correction immédiate et une
            explication détaillée pour chaque question. Le décor et l&rsquo;ambiance sonore changent avec le
            chapitre.
          </p>
          <div className="actions">
            {viewer?.hasAccess ? (
              <Link className="btn primary" href="/cours">
                Continuer mes révisions
              </Link>
            ) : viewer ? (
              <>
                <Link className="btn primary" href="/demo">
                  Essayer le mini-quiz
                </Link>
                <Link className="btn" href="/tarifs">
                  Voir les pass
                </Link>
              </>
            ) : (
              <>
                <Link className="btn primary" href="/inscription">
                  Créer un compte gratuit
                </Link>
                <Link className="btn" href="/tarifs">
                  Voir les tarifs
                </Link>
                <Link className="btn" href="/connexion">
                  Se connecter
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="paper soon" aria-labelledby="formules-titre">
        <h2 id="formules-titre">Comment ça marche</h2>
        <ul>
          <li>
            <strong>Compte gratuit</strong> : un mini-quiz de démonstration et l&rsquo;aperçu de chaque cours
            (couverture, sommaire).
          </li>
          <li>
            <strong>Pass</strong> : tous les quiz et tous les cours en PDF
            {premiumOnSale ? " (hors exclusivités Premium)" : ""}, jusqu&rsquo;à une date de fin connue avant
            l&rsquo;achat ; paiement unique, sans abonnement. <Link href="/tarifs">Voir les tarifs</Link>
          </li>
          {premiumOnSale && (
            <li>
              <strong>Pass Année Premium</strong> : tout le Pass Année, plus des exclusivités (chapitres et
              examens blancs réservés).
            </li>
          )}
          {hasExams && (
            <li>
              <strong>Examens blancs</strong> : des questions tirées au hasard, en temps limité, avec la
              correction complète et une note sur 20 à la fin.
            </li>
          )}
          <li>
            <strong>Bêta</strong> : les testeurs invités ont un accès gratuit jusqu&rsquo;à la fin de la bêta
            ; les questions qui n&rsquo;ont pas encore été relues portent la mention « en cours de relecture
            ».
          </li>
        </ul>
        <p>Une erreur dans une question ? Signale-la depuis la question concernée.</p>
      </section>

      {published.map((subject) => (
        <section className="paper" key={subject.id} aria-labelledby={`apercu-${subject.slug}`}>
          <div className="pad">
            <p className="course">Aperçu du contenu</p>
            <h2
              id={`apercu-${subject.slug}`}
              style={{ margin: "4px 0 0", fontFamily: "var(--serif)", fontSize: "1.5rem" }}
            >
              {subject.title}
            </h2>
          </div>
          {subject.chapters.map((chapter) => {
            const document = documents.get(chapter.id);
            return (
              <div className="row" key={chapter.id}>
                <span className="num" aria-hidden="true">
                  {chapter.number}
                </span>
                <div>
                  <h3>
                    {chapter.title}
                    {news.has(chapter.id) && <span className="pill new title-pill">Nouveau</span>}
                    {chapter.premium && <span className="pill premium title-pill">Premium</span>}
                  </h3>
                  <p>{chapter.summary}</p>
                </div>
                {document && document.previewPages > 0 && (
                  <Link className="btn small" href={`/apercu/${subject.slug}/${chapter.slug}`}>
                    Aperçu du cours<span className="visually-hidden"> : {chapter.title}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </section>
      ))}

      <section className="paper soon" aria-labelledby="niveaux-titre">
        <h2 id="niveaux-titre">Trois niveaux par chapitre</h2>
        <ul>
          {LEVELS.map((level) => (
            <li key={level.id}>
              <strong>{level.label}</strong> : {level.objective.toLowerCase()}
            </li>
          ))}
        </ul>
        <p>
          {levelsUnlock
            ? "Chaque niveau s’ouvre à partir de 70 % de bonnes réponses au niveau précédent. "
            : ""}
          À la fin de chaque niveau : ton score, le détail des réponses avec leurs explications, et un bouton
          « Refaire mes erreurs ». JuriQuizz ne remplace ni le cours, ni les manuels, ni les indications de
          tes enseignants. <Link href="/a-propos">En savoir plus</Link>.
        </p>
      </section>
    </>
  );
}
