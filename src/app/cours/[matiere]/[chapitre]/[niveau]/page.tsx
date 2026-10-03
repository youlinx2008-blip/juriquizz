import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { SceneSetter } from "@/components/scene-setter";
import { requireAccess } from "@/lib/auth";
import { getChapter, getMyQuestionStatus, getQuizQuestions } from "@/lib/data/catalog";
import { isLevelId, levelInfo } from "@/lib/levels";
import { openErrors } from "@/lib/quiz/progress";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/cours/[matiere]/[chapitre]/[niveau]">): Promise<Metadata> {
  const { niveau } = await params;
  return { title: isLevelId(niveau) ? `Quiz, niveau ${levelInfo(niveau).label}` : "Quiz" };
}

export default async function QuizPage({
  params,
  searchParams,
}: PageProps<"/cours/[matiere]/[chapitre]/[niveau]">) {
  const { matiere, chapitre, niveau } = await params;
  const { mode } = await searchParams;
  const viewer = await requireAccess(`/cours/${matiere}/${chapitre}/${niveau}`);
  if (!isLevelId(niveau)) notFound();
  const supabase = await createClient();
  const found = await getChapter(supabase, matiere, chapitre);
  if (!found) notFound();
  const { subject, chapter } = found;
  const chapterHref = `/cours/${subject.slug}/${chapter.slug}`;
  const questions = await getQuizQuestions(supabase, chapter.id, niveau);
  if (questions.length === 0) redirect(chapterHref);

  let startIds: string[] | null = null;
  if (mode === "erreurs") {
    const errors = openErrors(
      await getMyQuestionStatus(supabase, chapter.id),
      questions.map((question) => question.id),
    );
    startIds = questions.filter((question) => errors.has(question.id)).map((question) => question.id);
    if (startIds.length === 0) redirect(chapterHref);
  }

  return (
    <>
      <SceneSetter decor={questions[0].decor ?? chapter.defaultDecor} />
      <QuizRunner
        key={`${chapter.id}-${niveau}-${mode ?? "tout"}`}
        userId={viewer.userId}
        chapter={{
          id: chapter.id,
          label: chapter.label,
          title: chapter.title,
          defaultDecor: chapter.defaultDecor,
        }}
        chapterHref={chapterHref}
        level={niveau}
        questions={questions}
        startIds={startIds}
      />
    </>
  );
}
