import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ForgetExamDraft } from "@/components/exams/forget-exam-draft";
import { SceneSetter } from "@/components/scene-setter";
import { requireAccess } from "@/lib/auth";
import { getChapterTitles, getExam, getExamAttempt, getExamQuestions, isAttemptId } from "@/lib/data/exams";
import { formatDayTime } from "@/lib/dates";
import { formatDuration, onTwenty } from "@/lib/exam-format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Copie corrigée" };

export default async function ExamCopyPage({
  params,
}: PageProps<"/examens/[matiere]/[examen]/copie/[tentative]">) {
  const { matiere, examen, tentative } = await params;
  const examPath = `/examens/${matiere}/${examen}`;
  await requireAccess(`${examPath}/copie/${tentative}`);
  if (!isAttemptId(tentative)) notFound();
  const supabase = await createClient();
  const [exam, attempt] = await Promise.all([
    getExam(supabase, matiere, examen),
    getExamAttempt(supabase, tentative),
  ]);
  if (!exam || !attempt || attempt.examId !== exam.id) notFound();
  // Épreuve en cours (ou à rendre) : c'est la page de l'examen qui s'en charge.
  if (!attempt.submittedAt || attempt.total === null) redirect(examPath);

  const questions = await getExamQuestions(supabase, attempt.questionIds);
  const chapters = await getChapterTitles(supabase, [
    ...new Set(questions.map((question) => question.chapterId)),
  ]);
  const score = attempt.score ?? 0;
  const total = attempt.total;
  const minutes = Math.max(
    1,
    Math.round((Date.parse(attempt.submittedAt) - Date.parse(attempt.startedAt)) / 60_000),
  );

  // Détail par chapitre, dans l'ordre du cours.
  const byChapter = new Map<string, { good: number; total: number }>();
  for (const question of questions) {
    const line = byChapter.get(question.chapterId) ?? { good: 0, total: 0 };
    line.total += 1;
    if (attempt.answers[question.id] === question.correctOption) line.good += 1;
    byChapter.set(question.chapterId, line);
  }
  const breakdown = [...byChapter.entries()]
    .map(([id, line]) => ({ id, ...line, chapter: chapters.get(id) }))
    .sort((a, b) => (a.chapter?.position ?? 0) - (b.chapter?.position ?? 0));

  return (
    <>
      <SceneSetter decor="codex" />
      <ForgetExamDraft attemptId={attempt.id} />
      <section className="paper pad" aria-labelledby="copie-titre">
        <p className="course">
          {exam.subjectTitle} · {exam.title}
        </p>
        <h1 id="copie-titre" className="visually-hidden">
          Copie corrigée : {onTwenty(score, total)} sur 20
        </h1>
        <p className="score" aria-hidden="true">
          {onTwenty(score, total)}
          <small> / 20</small>
        </p>
        <p className="msg">
          {score} bonne{score > 1 ? "s" : ""} réponse{score > 1 ? "s" : ""} sur {total}, copie rendue le{" "}
          {formatDayTime(attempt.submittedAt)} en {formatDuration(minutes)}.
        </p>
        {attempt.late && (
          <p className="notice warn" style={{ marginBottom: 12 }}>
            Copie rendue après la fin du temps : la note est indicative.
          </p>
        )}
        <p className="exam-hint">
          Une note d&rsquo;entraînement, pour repérer les chapitres à revoir : elle ne présage pas de la note
          à l&rsquo;examen.
        </p>
        <div className="actions">
          <Link className="btn primary" href={examPath}>
            Repasser l&rsquo;examen
          </Link>
          <Link className="btn" href="/examens">
            Tous les examens
          </Link>
          <Link className="btn" href="/progression">
            Ma progression
          </Link>
        </div>
      </section>

      {breakdown.length > 0 && (
        <section className="paper pad" aria-labelledby="detail-titre">
          <h2 id="detail-titre" className="exam-section-title">
            Par chapitre
          </h2>
          <ul className="exam-breakdown">
            {breakdown.map((line) => {
              const rate = line.good / line.total;
              return (
                <li key={line.id}>
                  <span>
                    {line.chapter
                      ? `${line.chapter.label}, ${line.chapter.title}`
                      : "Chapitre retiré du cours"}
                  </span>
                  <span className={rate >= 0.7 ? "ok" : "ko"}>
                    {line.good} sur {line.total}
                  </span>
                  <span className="bar" aria-hidden="true">
                    <i style={{ width: `${Math.round(rate * 100)}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="paper pad" aria-labelledby="correction-titre">
        <h2 id="correction-titre" className="exam-section-title">
          Correction
        </h2>
        {questions.length < total && (
          <p className="notice" style={{ marginBottom: 12 }}>
            {total - questions.length === 1
              ? "Une question de l’épreuve n’est plus disponible"
              : `${total - questions.length} questions de l’épreuve ne sont plus disponibles`}{" "}
            (retirées du cours, ou réservées à un autre pass) : la note reste celle du jour.
          </p>
        )}
        <div className="review" style={{ marginTop: 0 }}>
          {questions.map((question, index) => {
            const chosenId = attempt.answers[question.id];
            const good = chosenId === question.correctOption;
            const mine = question.options.find((option) => option.id === chosenId);
            const right = question.options.find((option) => option.id === question.correctOption);
            return (
              <details key={question.id}>
                <summary>
                  {index + 1}.{" "}
                  <span className={good ? "ok" : "ko"}>
                    {good ? "Juste" : mine ? "Faux" : "Sans réponse"}
                  </span>{" "}
                  : {question.prompt}
                </summary>
                <div className="body">
                  {!good && <p>Ta réponse : {mine ? mine.text : "aucune"}</p>}
                  <p>
                    Bonne réponse : <strong>{right?.text}</strong>
                  </p>
                  {question.explanation.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </>
  );
}
