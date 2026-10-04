import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExamLateSubmit } from "@/components/exams/exam-late-submit";
import { ExamRunner } from "@/components/exams/exam-runner";
import { ExamStartForm } from "@/components/exams/exam-start-form";
import { SceneSetter } from "@/components/scene-setter";
import { requireAccess } from "@/lib/auth";
import { getExam, getExamQuestions, getMyExamAttempts, isRunning } from "@/lib/data/exams";
import { formatDayTime, serverNow } from "@/lib/dates";
import { formatDuration, onTwenty } from "@/lib/exam-format";
import { levelInfo } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/examens/[matiere]/[examen]">): Promise<Metadata> {
  const { matiere, examen } = await params;
  const exam = await getExam(await createClient(), matiere, examen).catch(() => null);
  return { title: exam ? exam.title : "Examen blanc" };
}

export default async function ExamPage({ params }: PageProps<"/examens/[matiere]/[examen]">) {
  const { matiere, examen } = await params;
  const path = `/examens/${matiere}/${examen}`;
  const viewer = await requireAccess(path);
  const supabase = await createClient();
  const exam = await getExam(supabase, matiere, examen);
  if (!exam || (!exam.visible && !viewer.isAdmin)) notFound();
  const attempts = await getMyExamAttempts(supabase, exam.id);
  const running = attempts.find(isRunning);

  if (running) {
    const questions = await getExamQuestions(supabase, running.questionIds);
    if (questions.length === 0) {
      return (
        <section className="paper pad">
          <h1 className="title small">{exam.title}</h1>
          <p className="lead">
            Les questions de cette épreuve ne sont plus disponibles avec ton accès actuel. L&rsquo;épreuve
            s&rsquo;arrêtera d&rsquo;elle-même à la fin du temps prévu.
          </p>
          <div className="actions">
            <Link className="btn" href="/examens">
              Tous les examens
            </Link>
          </div>
        </section>
      );
    }
    return (
      <>
        <SceneSetter decor="codex" />
        <ExamRunner
          attemptId={running.id}
          title={exam.title}
          deadline={running.deadline}
          serverNow={serverNow()}
          resultHref={`${path}/copie/${running.id}`}
          // Ni bonne réponse ni explication pendant l'épreuve : elles viennent avec la copie corrigée.
          questions={questions.map(({ id, type, prompt, options }) => ({ id, type, prompt, options }))}
        />
      </>
    );
  }

  // Temps écoulé page fermée : la copie gardée dans le navigateur est rendue avant toute chose.
  const expired = attempts.find((attempt) => attempt.submittedAt === null);
  if (expired) {
    return (
      <>
        <SceneSetter decor="codex" />
        <ExamLateSubmit attemptId={expired.id} resultHref={`${path}/copie/${expired.id}`} />
      </>
    );
  }

  const done = attempts.filter((attempt) => attempt.submittedAt && attempt.total);
  const locked = exam.premium && !viewer.hasPremium;

  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <Link className="chip" href="/examens">
          Tous les examens
        </Link>
        <p className="course" style={{ marginTop: 14 }}>
          {exam.subjectTitle} · examen blanc
        </p>
        <h1 className="title small">
          {exam.title}
          {exam.premium && <span className="pill premium title-pill">Premium</span>}
        </h1>
        {exam.description && <p className="lead">{exam.description}</p>}
        <ul className="exam-rules">
          <li>
            <strong>{exam.questionCount} questions</strong> tirées au hasard (niveaux{" "}
            {exam.levels.map((level) => levelInfo(level).label.toLowerCase()).join(", ")}), différentes à
            chaque passage.
          </li>
          <li>
            <strong>{formatDuration(exam.durationMinutes)}</strong> : le chronomètre part dès le début et ne
            s&rsquo;arrête pas, même si tu fermes la page. À la fin du temps, la copie est rendue telle
            quelle.
          </li>
          <li>
            Pas d&rsquo;indice ni de correction pendant l&rsquo;épreuve ; tu peux revenir sur tes réponses.
          </li>
          <li>À la fin : ta note sur 20, le détail par chapitre et la correction complète.</li>
        </ul>
        <div className="actions">
          {locked ? (
            <Link className="btn primary" href="/tarifs/premium">
              Réservé au Pass Année Premium
            </Link>
          ) : (
            <ExamStartForm
              examId={exam.id}
              back={path}
              label={done.length ? "Repasser l’examen" : "Commencer l’épreuve"}
            />
          )}
        </div>
      </section>
      {done.length > 0 && (
        <section className="paper pad" aria-labelledby="copies-titre">
          <h2 id="copies-titre" style={{ marginTop: 0, fontSize: "1.1rem" }}>
            Mes copies
          </h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {done.map((attempt) => (
              <li key={attempt.id} style={{ marginBottom: 4 }}>
                <Link href={`${path}/copie/${attempt.id}`}>
                  {formatDayTime(attempt.submittedAt!)} : {onTwenty(attempt.score ?? 0, attempt.total!)}/20 (
                  {attempt.score} sur {attempt.total})
                </Link>
                {attempt.late ? " · rendue hors délai" : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
