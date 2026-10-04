import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Emblem } from "@/components/emblem";
import { SceneSetter } from "@/components/scene-setter";
import { requireAccess } from "@/lib/auth";
import { getChapter, getMyAttempts, getMyQuestionStatus, getVisibleQuestionRefs } from "@/lib/data/catalog";
import { getDocument } from "@/lib/data/documents";
import { LEVELS } from "@/lib/levels";
import { openErrors, summarizeAttempts } from "@/lib/quiz/progress";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/cours/[matiere]/[chapitre]">): Promise<Metadata> {
  const { matiere, chapitre } = await params;
  const found = await getChapter(await createClient(), matiere, chapitre).catch(() => null);
  return { title: found ? found.chapter.title : "Chapitre" };
}

export default async function ChapterPage({ params }: PageProps<"/cours/[matiere]/[chapitre]">) {
  const { matiere, chapitre } = await params;
  await requireAccess(`/cours/${matiere}/${chapitre}`);
  const supabase = await createClient();
  const found = await getChapter(supabase, matiere, chapitre);
  if (!found) notFound();
  const { subject, chapter } = found;
  const [refs, attempts, statuses, document] = await Promise.all([
    getVisibleQuestionRefs(supabase, chapter.id),
    getMyAttempts(supabase, chapter.id),
    getMyQuestionStatus(supabase, chapter.id),
    getDocument(supabase, chapter.id),
  ]);
  const progress = summarizeAttempts(attempts);
  const errors = openErrors(
    statuses,
    refs.map((ref) => ref.id),
  );

  return (
    <>
      <SceneSetter decor={chapter.defaultDecor} />
      <section className="paper">
        <div className="pad hero">
          <span className="emblem" aria-hidden="true">
            <Emblem decor={chapter.defaultDecor} />
          </span>
          <Link className="chip" href={`/cours#${subject.slug}`}>
            Tous les chapitres
          </Link>
          <p className="course" style={{ marginTop: 14 }}>
            {chapter.number === "0" ? subject.title : `${subject.title}, ${chapter.label}`}
          </p>
          <h1 className="title">{chapter.title}</h1>
          <p className="lead">{chapter.summary}</p>
        </div>
        <h2 className="levels-title">Choisis ton niveau</h2>
        {LEVELS.map((level, index) => {
          const ids = refs.filter((ref) => ref.level === level.id).map((ref) => ref.id);
          const p = progress.get(`${chapter.id}:${level.id}`);
          const levelErrors = ids.filter((id) => errors.has(id)).length;
          const href = `/cours/${subject.slug}/${chapter.slug}/${level.id}`;
          return (
            <div className="row" key={level.id}>
              <span className="steps" aria-hidden="true">
                {[0, 1, 2].map((n) => (
                  <i key={n} className={n <= index ? "on" : ""} />
                ))}
              </span>
              <div>
                <h3>{level.label}</h3>
                <p>{level.objective}</p>
                <div className="meta">
                  <span>{ids.length} questions</span>
                  <span>
                    {p ? `Meilleur score : ${p.best.score} sur ${p.best.total}` : "Pas encore tenté"}
                  </span>
                  {levelErrors > 0 && (
                    <span>
                      {levelErrors} erreur{levelErrors > 1 ? "s" : ""} à refaire
                    </span>
                  )}
                </div>
              </div>
              {ids.length > 0 && (
                <div className="row-actions">
                  <Link className="btn primary" href={href}>
                    {p ? "Rejouer" : "Commencer"}
                    <span className="visually-hidden"> : niveau {level.label}</span>
                  </Link>
                  {levelErrors > 0 && (
                    <Link className="btn" href={`${href}?mode=erreurs`}>
                      Refaire mes erreurs<span className="visually-hidden"> du niveau {level.label}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
      {document && (
        <section className="paper" aria-labelledby="cours-pdf-titre">
          <div className="row">
            <span className="num" aria-hidden="true">
              §
            </span>
            <div>
              <h2 id="cours-pdf-titre" style={{ margin: 0, fontSize: "1.1rem" }}>
                Le cours en PDF
              </h2>
              <p>{document.title || chapter.title}</p>
              <div className="meta">
                <span>
                  {document.pageCount} page{document.pageCount > 1 ? "s" : ""}
                </span>
                <span>Exemplaire personnel, à lire dans JuriQuizz</span>
              </div>
            </div>
            <Link className="btn primary" href={`/cours/${subject.slug}/${chapter.slug}/lecture`}>
              Lire le cours<span className="visually-hidden"> : {chapter.title}</span>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
