import type { Metadata } from "next";
import Link from "next/link";
import { SceneSetter } from "@/components/scene-setter";
import { requireAccess } from "@/lib/auth";
import { getMyAttempts, getMyQuestionStatus, getSubjects, getVisibleQuestionRefs } from "@/lib/data/catalog";
import { getExams, getMyExamAttempts } from "@/lib/data/exams";
import { formatDayTime } from "@/lib/dates";
import { onTwenty } from "@/lib/exam-format";
import { LEVELS } from "@/lib/levels";
import { summarizeAttempts } from "@/lib/quiz/progress";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ma progression" };

function percent(part: number, total: number): string {
  return total ? `${Math.round((part / total) * 100)} %` : "–";
}

export default async function ProgressPage() {
  await requireAccess("/progression");
  const supabase = await createClient();
  const [subjects, refs, attempts, statuses, exams, examAttempts] = await Promise.all([
    getSubjects(supabase),
    getVisibleQuestionRefs(supabase),
    getMyAttempts(supabase),
    getMyQuestionStatus(supabase),
    getExams(supabase),
    getMyExamAttempts(supabase),
  ]);
  const examById = new Map(exams.map((exam) => [exam.id, exam]));
  const copies = examAttempts
    .filter((attempt) => attempt.submittedAt && attempt.total && examById.has(attempt.examId))
    .slice(0, 10);
  const progress = summarizeAttempts(attempts);
  const lastAnswer = new Map(statuses.map((status) => [status.question_id, status.last_correct]));
  const visible = new Set(refs.map((ref) => ref.id));
  const mastered = refs.filter((ref) => lastAnswer.get(ref.id) === true).length;
  const toRedo = refs.filter((ref) => lastAnswer.get(ref.id) === false).length;
  const unseen = refs.filter((ref) => !lastAnswer.has(ref.id)).length;
  const played = attempts.filter((attempt) => !attempt.retry).length;

  return (
    <>
      <SceneSetter decor="plaine" />
      <section className="paper pad">
        <p className="course">Ta progression</p>
        <h1 className="title small">Où en es-tu ?</h1>
        <div className="stats-grid" style={{ marginTop: 10 }}>
          <div className="stat">
            <b>{mastered}</b>
            <span>questions réussies à la dernière réponse ({percent(mastered, visible.size)})</span>
          </div>
          <div className="stat">
            <b>{toRedo}</b>
            <span>erreurs à refaire</span>
          </div>
          <div className="stat">
            <b>{unseen}</b>
            <span>questions pas encore vues</span>
          </div>
          <div className="stat">
            <b>{played}</b>
            <span>niveaux joués en tout</span>
          </div>
        </div>
      </section>

      {copies.length > 0 && (
        <section className="paper pad" aria-labelledby="progression-examens">
          <h2 id="progression-examens" style={{ margin: "0 0 10px", fontFamily: "var(--serif)" }}>
            Examens blancs
          </h2>
          <ul className="exam-breakdown">
            {copies.map((attempt) => {
              const exam = examById.get(attempt.examId)!;
              return (
                <li key={attempt.id}>
                  <Link href={`/examens/${exam.subjectSlug}/${exam.slug}/copie/${attempt.id}`}>
                    {exam.title}, {formatDayTime(attempt.submittedAt!)}
                  </Link>
                  <span>
                    {onTwenty(attempt.score ?? 0, attempt.total!)}/20
                    {attempt.late ? " (hors délai)" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {subjects.map((subject) => (
        <section className="paper" key={subject.id} aria-labelledby={`progression-${subject.slug}`}>
          <div className="pad" style={{ paddingBottom: 10 }}>
            <h2 id={`progression-${subject.slug}`} style={{ margin: 0, fontFamily: "var(--serif)" }}>
              {subject.title}
            </h2>
          </div>
          <div className="table-wrap" style={{ padding: "0 22px 18px" }}>
            <table className="data">
              <caption className="visually-hidden">Scores par chapitre et par niveau</caption>
              <thead>
                <tr>
                  <th scope="col">Chapitre</th>
                  {LEVELS.map((level) => (
                    <th scope="col" key={level.id}>
                      {level.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subject.chapters.map((chapter) => (
                  <tr key={chapter.id}>
                    <th scope="row">
                      <Link href={`/cours/${subject.slug}/${chapter.slug}`}>
                        {chapter.label} : {chapter.title}
                      </Link>
                    </th>
                    {LEVELS.map((level) => {
                      const p = progress.get(`${chapter.id}:${level.id}`);
                      const ids = refs.filter(
                        (ref) => ref.chapterId === chapter.id && ref.level === level.id,
                      );
                      const errors = ids.filter((ref) => lastAnswer.get(ref.id) === false).length;
                      return (
                        <td key={level.id} className="num-cell">
                          {p ? (
                            <>
                              <div>
                                Meilleur : {p.best.score}/{p.best.total}
                              </div>
                              <div style={{ color: "var(--ink2)" }}>
                                {p.attempts} partie{p.attempts > 1 ? "s" : ""}
                                {errors ? `, ${errors} à refaire` : ""}
                              </div>
                            </>
                          ) : ids.length ? (
                            <span style={{ color: "var(--ink2)" }}>Pas encore tenté</span>
                          ) : (
                            "–"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
