import "server-only";
import { isDecorKey, type DecorKey } from "@/lib/decors/registry";
import { isLevelId, type LevelId } from "@/lib/levels";
import type { QuizQuestion } from "@/lib/quiz/engine";
import type { AttemptRow } from "@/lib/quiz/progress";
import type { ServerClient } from "@/lib/supabase/server";

export type Chapter = {
  id: string;
  subjectId: string;
  slug: string;
  number: string;
  label: string;
  title: string;
  summary: string;
  defaultDecor: DecorKey;
  position: number;
};

export type Subject = {
  id: string;
  slug: string;
  title: string;
  visible: boolean;
  chapters: Chapter[];
};

/** Données d'une requête réussie ; une erreur de base de données est levée telle quelle. */
function rows<T>(result: { data: T[] | null; error: { message: string } | null }): T[] {
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

function maybe<T>(result: { data: T | null; error: { message: string } | null }): T | null {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function toChapter(row: {
  id: string;
  subject_id: string;
  slug: string;
  number: string;
  label: string;
  title: string;
  summary: string;
  default_decor: string;
  position: number;
}): Chapter {
  return {
    id: row.id,
    subjectId: row.subject_id,
    slug: row.slug,
    number: row.number,
    label: row.label,
    title: row.title,
    summary: row.summary,
    defaultDecor: isDecorKey(row.default_decor) ? row.default_decor : "codex",
    position: row.position,
  };
}

const CHAPTER_COLUMNS = "id, subject_id, slug, number, label, title, summary, default_decor, position";

/** Matières lisibles par l'utilisateur (publiées, ou toutes pour l'administration), avec leurs chapitres. */
export async function getSubjects(supabase: ServerClient): Promise<Subject[]> {
  const subjects = rows(
    await supabase
      .from("subjects")
      .select("id, slug, title, visible, position")
      .order("position")
      .order("title"),
  );
  const chapters = rows(await supabase.from("chapters").select(CHAPTER_COLUMNS).order("position"));
  return subjects.map((subject) => ({
    id: subject.id,
    slug: subject.slug,
    title: subject.title,
    visible: subject.visible,
    chapters: chapters.filter((chapter) => chapter.subject_id === subject.id).map(toChapter),
  }));
}

export async function getChapter(
  supabase: ServerClient,
  subjectSlug: string,
  chapterSlug: string,
): Promise<{ subject: { id: string; slug: string; title: string }; chapter: Chapter } | null> {
  // Requêtes affectées à une variable d'abord : sinon TypeScript déduit mal le type de maybeSingle().
  const subjectResult = await supabase
    .from("subjects")
    .select("id, slug, title")
    .eq("slug", subjectSlug)
    .maybeSingle();
  const subject = maybe(subjectResult);
  if (!subject) return null;
  const chapterResult = await supabase
    .from("chapters")
    .select(CHAPTER_COLUMNS)
    .eq("subject_id", subject.id)
    .eq("slug", chapterSlug)
    .maybeSingle();
  const chapter = maybe(chapterResult);
  if (!chapter) return null;
  return { subject, chapter: toChapter(chapter) };
}

export type QuestionRef = { id: string; chapterId: string; level: LevelId };

/** Questions visibles (la RLS filtre selon l'accès et la relecture) : identifiants seulement. */
export async function getVisibleQuestionRefs(
  supabase: ServerClient,
  chapterId?: string,
): Promise<QuestionRef[]> {
  let query = supabase
    .from("questions")
    .select("id, chapter_id, level")
    .is("retired_at", null)
    .order("position");
  if (chapterId) query = query.eq("chapter_id", chapterId);
  return rows(await query)
    .filter((row) => isLevelId(row.level))
    .map((row) => ({ id: row.id, chapterId: row.chapter_id, level: row.level as LevelId }));
}

export function countByChapterLevel(refs: QuestionRef[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ref of refs) {
    const key = `${ref.chapterId}:${ref.level}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Questions d'un niveau, dans l'ordre du fichier, avec leurs corrections. */
export async function getQuizQuestions(
  supabase: ServerClient,
  chapterId: string,
  level: LevelId,
): Promise<QuizQuestion[]> {
  const result = rows(
    await supabase
      .from("questions")
      .select("id, type, decor, prompt, options, correct_option, hint, explanation, review_status")
      .eq("chapter_id", chapterId)
      .eq("level", level)
      .is("retired_at", null)
      .order("position"),
  );
  return result.map((row) => ({
    id: row.id,
    type: row.type,
    decor: isDecorKey(row.decor) ? row.decor : null,
    prompt: row.prompt,
    options: row.options as { id: string; text: string }[],
    correctOption: row.correct_option,
    hint: row.hint,
    explanation: row.explanation as string[],
    reviewStatus: row.review_status,
  }));
}

export async function getMyAttempts(supabase: ServerClient, chapterId?: string): Promise<AttemptRow[]> {
  let query = supabase
    .from("attempts")
    .select("chapter_id, level, score, total, retry, created_at")
    .order("created_at", { ascending: true });
  if (chapterId) query = query.eq("chapter_id", chapterId);
  return rows(await query).filter((row) => isLevelId(row.level)) as AttemptRow[];
}

export async function getMyQuestionStatus(supabase: ServerClient, chapterId?: string) {
  return rows(await supabase.rpc("my_question_status", chapterId ? { p_chapter_id: chapterId } : {}));
}
