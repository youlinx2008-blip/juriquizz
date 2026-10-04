import type { Metadata } from "next";
import Link from "next/link";
import { SceneSetter } from "@/components/scene-setter";
import { requireAccess } from "@/lib/auth";
import {
  countByChapterLevel,
  getMyAttempts,
  getNewChapterIds,
  getSubjects,
  getVisibleQuestionRefs,
} from "@/lib/data/catalog";
import { getDocuments } from "@/lib/data/documents";
import { HOME_DECOR } from "@/lib/decors/registry";
import { LEVELS } from "@/lib/levels";
import { summarizeAttempts } from "@/lib/quiz/progress";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cours" };

export default async function CatalogPage() {
  const viewer = await requireAccess("/cours");
  const supabase = await createClient();
  const [subjects, refs, attempts, news] = await Promise.all([
    getSubjects(supabase),
    getVisibleQuestionRefs(supabase),
    getMyAttempts(supabase),
    getNewChapterIds(supabase),
  ]);
  const counts = countByChapterLevel(refs);
  const progress = summarizeAttempts(attempts);
  const documents = await getDocuments(
    supabase,
    subjects.flatMap((subject) => subject.chapters.map((chapter) => chapter.id)),
  );

  return (
    <>
      <SceneSetter decor={HOME_DECOR} />
      {subjects.length === 0 && (
        <section className="paper pad">
          <h1 className="title small">Aucun cours pour le moment</h1>
          <p className="lead">Les cours apparaîtront ici dès leur publication.</p>
        </section>
      )}
      {subjects.map((subject, index) => (
        <section
          className="paper"
          key={subject.id}
          id={subject.slug}
          aria-labelledby={`matiere-${subject.slug}`}
        >
          <div className="pad">
            <p className="course">Cours de L1 de droit</p>
            {index === 0 ? (
              <h1 className="title" id={`matiere-${subject.slug}`}>
                {subject.title}
              </h1>
            ) : (
              <h2 className="title" id={`matiere-${subject.slug}`}>
                {subject.title}
              </h2>
            )}
            {!subject.visible && viewer.isAdmin && (
              <p className="notice warn">Matière masquée : visible seulement par l&rsquo;administration.</p>
            )}
            <p className="lead">
              Choisis un chapitre. Chaque chapitre propose trois niveaux de quiz, des explications détaillées,
              et une ambiance visuelle et sonore qui change avec les questions.
            </p>
          </div>
          <h2 className="levels-title">Chapitres</h2>
          {subject.chapters.map((chapter) => {
            const total = LEVELS.reduce(
              (sum, level) => sum + (counts.get(`${chapter.id}:${level.id}`) ?? 0),
              0,
            );
            const tried = LEVELS.filter((level) => progress.has(`${chapter.id}:${level.id}`)).length;
            // Exclusivité Premium : son contenu n'est pas lisible sans le Pass Année Premium.
            const locked = chapter.premium && !viewer.hasPremium;
            return (
              <div className="row" key={chapter.id}>
                <span className="num" aria-hidden="true">
                  {chapter.number}
                </span>
                <div>
                  <h3>
                    <span className="visually-hidden">{chapter.label} : </span>
                    {chapter.title}
                    {news.has(chapter.id) && <span className="pill new title-pill">Nouveau</span>}
                    {chapter.premium && <span className="pill premium title-pill">Premium</span>}
                  </h3>
                  <p>{chapter.summary}</p>
                  <div className="meta">
                    {locked ? (
                      <span>Exclusivité du Pass Année Premium</span>
                    ) : (
                      <span>{total ? `3 niveaux, ${total} questions` : "En préparation"}</span>
                    )}
                    {documents.has(chapter.id) && <span>Cours en PDF</span>}
                    {total > 0 && (
                      <span>
                        {tried
                          ? `${tried} niveau${tried > 1 ? "x" : ""} tenté${tried > 1 ? "s" : ""}`
                          : "Pas encore tenté"}
                      </span>
                    )}
                  </div>
                </div>
                {locked ? (
                  <Link className="btn" href={`/cours/${subject.slug}/${chapter.slug}`}>
                    Découvrir<span className="visually-hidden"> : {chapter.title}</span>
                  </Link>
                ) : (
                  (total > 0 || documents.has(chapter.id)) && (
                    <Link className="btn primary" href={`/cours/${subject.slug}/${chapter.slug}`}>
                      Ouvrir<span className="visually-hidden"> : {chapter.title}</span>
                    </Link>
                  )
                )}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
