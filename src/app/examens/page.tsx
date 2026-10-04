import type { Metadata } from "next";
import Link from "next/link";
import { SceneSetter } from "@/components/scene-setter";
import { requireAccess } from "@/lib/auth";
import { getExams, getMyExamAttempts } from "@/lib/data/exams";
import { formatDuration, onTwenty } from "@/lib/exam-format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Examens blancs" };

export default async function ExamsPage() {
  const viewer = await requireAccess("/examens");
  const supabase = await createClient();
  const [exams, attempts] = await Promise.all([getExams(supabase), getMyExamAttempts(supabase)]);
  const visible = exams.filter((exam) => exam.visible || viewer.isAdmin);

  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">Entraînement en conditions réelles</p>
        <h1 className="title small">Examens blancs</h1>
        <p className="lead">
          Des questions tirées au hasard dans les chapitres du cours, un temps limité, et la correction
          complète seulement à la fin. De quoi s&rsquo;entraîner au rythme des partiels.
        </p>
      </section>
      {visible.length === 0 ? (
        <section className="paper pad">
          <p style={{ margin: 0 }}>Aucun examen blanc pour le moment : ils apparaîtront ici.</p>
        </section>
      ) : (
        <section className="paper" aria-label="Examens disponibles">
          {visible.map((exam) => {
            const mine = attempts.filter((attempt) => attempt.examId === exam.id && attempt.submittedAt);
            const best = mine.reduce<(typeof mine)[number] | null>(
              (top, attempt) =>
                !top || (attempt.score ?? 0) / (attempt.total || 1) > (top.score ?? 0) / (top.total || 1)
                  ? attempt
                  : top,
              null,
            );
            const locked = exam.premium && !viewer.hasPremium;
            return (
              <div className="row" key={exam.id}>
                <span className="num" aria-hidden="true">
                  {exam.durationMinutes}&prime;
                </span>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
                    {exam.title}
                    {exam.premium && <span className="pill premium title-pill">Premium</span>}
                    {!exam.visible && <span className="pill title-pill">Masqué</span>}
                  </h2>
                  <p>{exam.description || exam.subjectTitle}</p>
                  <div className="meta">
                    <span>{exam.questionCount} questions</span>
                    <span>{formatDuration(exam.durationMinutes)}</span>
                    <span>
                      {best && best.total
                        ? `Meilleure note : ${onTwenty(best.score ?? 0, best.total)}/20`
                        : "Pas encore passé"}
                    </span>
                  </div>
                </div>
                {locked ? (
                  <Link className="btn" href="/tarifs/premium">
                    Premium<span className="visually-hidden"> : {exam.title}</span>
                  </Link>
                ) : (
                  <Link className="btn primary" href={`/examens/${exam.subjectSlug}/${exam.slug}`}>
                    Ouvrir<span className="visually-hidden"> : {exam.title}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
