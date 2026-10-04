import type { Metadata } from "next";
import Link from "next/link";
import { DeleteExamForm, ExamForm, type ExamFormSubject } from "@/components/admin/exam-forms";
import { SceneSetter } from "@/components/scene-setter";
import { getSubjects } from "@/lib/data/catalog";
import { getExams } from "@/lib/data/exams";
import { formatDay } from "@/lib/dates";
import { formatDuration } from "@/lib/exam-format";
import { levelInfo } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Examens blancs" };

export default async function AdminExamsPage() {
  const supabase = await createClient();
  const [subjects, exams] = await Promise.all([getSubjects(supabase), getExams(supabase)]);
  // Questions relues disponibles pour chaque examen : ce que tirera l'épreuve d'un acheteur.
  const pools = new Map(
    await Promise.all(
      exams.map(async (exam) => {
        const { data, error } = await supabase.rpc("exam_relue_pool_size", { p_exam_id: exam.id });
        if (error) throw new Error(error.message);
        return [exam.id, data ?? 0] as const;
      }),
    ),
  );
  const formSubjects: ExamFormSubject[] = subjects.map((subject) => ({
    id: subject.id,
    title: subject.title,
    chapters: subject.chapters.map(({ id, label, title }) => ({ id, label, title })),
  }));
  const chapterNames = new Map(
    subjects.flatMap((subject) => subject.chapters.map((chapter) => [chapter.id, chapter.label] as const)),
  );

  return (
    <>
      <SceneSetter decor="chateau" />
      <section className="paper pad">
        <h1 className="title small">Examens blancs</h1>
        <p className="lead">
          Chaque passage tire des questions au hasard dans les chapitres et niveaux choisis, avec un temps
          limité ; la correction n&rsquo;apparaît qu&rsquo;une fois la copie rendue. Seules les questions
          relues sont tirées pour les acheteurs (les testeurs de la bêta voient aussi celles en cours de
          relecture).
        </p>
        <p className="fine">
          Un examen proposé aux étudiants ne peut plus devenir une exclusivité Premium, ni être supprimé : il
          se masque. <Link href="/examens">Voir la page Examens</Link>
        </p>
      </section>

      {exams.map((exam) => {
        const pool = pools.get(exam.id) ?? 0;
        return (
          <section className="paper pad" key={exam.id} aria-labelledby={`admin-examen-${exam.id}`}>
            <h2 id={`admin-examen-${exam.id}`} style={{ margin: "0 0 6px", fontSize: "1.15rem" }}>
              {exam.title}
              <span className={`pill title-pill ${exam.visible ? "relue" : "a_relire"}`}>
                {exam.visible ? "Proposé" : "Masqué"}
              </span>
              {exam.premium && <span className="pill premium title-pill">Premium</span>}
            </h2>
            <p className="fine">
              {exam.subjectTitle} · {exam.questionCount} questions · {formatDuration(exam.durationMinutes)} ·{" "}
              {exam.levels.map((level) => levelInfo(level).label).join(", ")} ·{" "}
              {exam.chapterIds.length
                ? exam.chapterIds.map((id) => chapterNames.get(id) ?? "chapitre retiré").join(", ")
                : "toute la matière"}
              {exam.publishedAt ? ` · publié le ${formatDay(exam.publishedAt)}` : " · jamais publié"}
            </p>
            <p
              className={`notice ${pool < 5 ? "bad" : pool < exam.questionCount ? "warn" : "good"}`}
              style={{ margin: "10px 0" }}
            >
              {pool} question{pool > 1 ? "s" : ""} relue{pool > 1 ? "s" : ""} disponible{pool > 1 ? "s" : ""}.
              {pool < 5
                ? " Pas assez pour qu’un acheteur puisse commencer l’épreuve (5 au moins)."
                : pool < exam.questionCount
                  ? ` L’épreuve en tirera ${pool} au lieu de ${exam.questionCount}.`
                  : ""}
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <Link href={`/examens/${exam.subjectSlug}/${exam.slug}`}>Ouvrir la page de l&rsquo;examen</Link>
            </p>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Modifier</summary>
              <div style={{ marginTop: 12 }}>
                <ExamForm
                  subjects={formSubjects}
                  exam={{
                    id: exam.id,
                    subjectId: exam.subjectId,
                    title: exam.title,
                    slug: exam.slug,
                    description: exam.description,
                    questionCount: exam.questionCount,
                    durationMinutes: exam.durationMinutes,
                    levels: exam.levels,
                    chapterIds: exam.chapterIds,
                    premium: exam.premium,
                    visible: exam.visible,
                    position: exam.position,
                    published: exam.publishedAt !== null,
                  }}
                />
              </div>
            </details>
            {!exam.publishedAt && (
              <div style={{ marginTop: 12 }}>
                <DeleteExamForm examId={exam.id} title={exam.title} />
              </div>
            )}
          </section>
        );
      })}

      <section className="paper pad" aria-labelledby="admin-examen-nouveau">
        <h2 id="admin-examen-nouveau" style={{ marginTop: 0 }}>
          Nouvel examen
        </h2>
        {formSubjects.length ? (
          <ExamForm subjects={formSubjects} />
        ) : (
          <p className="fine">Importe d&rsquo;abord une matière.</p>
        )}
      </section>
    </>
  );
}
