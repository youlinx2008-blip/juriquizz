import "server-only";
import { isLevelId, type LevelId } from "@/lib/levels";
import type { ServerClient } from "@/lib/supabase/server";

export type MockExam = {
  id: string;
  subjectId: string;
  subjectSlug: string;
  subjectTitle: string;
  slug: string;
  title: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  chapterIds: string[];
  levels: LevelId[];
  premium: boolean;
  visible: boolean;
  publishedAt: string | null;
  position: number;
};

export type ExamAttempt = {
  id: string;
  examId: string;
  questionIds: string[];
  startedAt: string;
  deadline: string;
  submittedAt: string | null;
  answers: Record<string, string>;
  score: number | null;
  total: number | null;
  late: boolean;
};

type ExamRow = {
  id: string;
  subject_id: string;
  slug: string;
  title: string;
  description: string;
  question_count: number;
  duration_minutes: number;
  chapter_ids: string[];
  levels: string[];
  premium: boolean;
  visible: boolean;
  published_at: string | null;
  position: number;
  subjects: { slug: string; title: string } | null;
};

const EXAM_COLUMNS =
  "id, subject_id, slug, title, description, question_count, duration_minutes, chapter_ids, levels, premium, visible, published_at, position, subjects!inner(slug, title)";

function toExam(row: ExamRow): MockExam {
  return {
    id: row.id,
    subjectId: row.subject_id,
    subjectSlug: row.subjects?.slug ?? "",
    subjectTitle: row.subjects?.title ?? "",
    slug: row.slug,
    title: row.title,
    description: row.description,
    questionCount: row.question_count,
    durationMinutes: row.duration_minutes,
    chapterIds: row.chapter_ids,
    levels: row.levels.filter(isLevelId),
    premium: row.premium,
    visible: row.visible,
    publishedAt: row.published_at,
    position: row.position,
  };
}

/** Examens lisibles (publiés, ou tous pour l'administration), par matière puis par position. */
export async function getExams(supabase: ServerClient): Promise<MockExam[]> {
  const { data, error } = await supabase.from("mock_exams").select(EXAM_COLUMNS).order("position");
  if (error) throw new Error(error.message);
  return (data as unknown as ExamRow[])
    .map(toExam)
    .sort((a, b) => a.subjectTitle.localeCompare(b.subjectTitle, "fr") || a.position - b.position);
}

export async function getExam(
  supabase: ServerClient,
  subjectSlug: string,
  examSlug: string,
): Promise<MockExam | null> {
  const result = await supabase
    .from("mock_exams")
    .select(EXAM_COLUMNS)
    .eq("slug", examSlug)
    .eq("subjects.slug", subjectSlug)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toExam(result.data as unknown as ExamRow) : null;
}

type AttemptRow = {
  id: string;
  exam_id: string;
  question_ids: string[];
  started_at: string;
  deadline: string;
  submitted_at: string | null;
  answers: unknown;
  score: number | null;
  total: number | null;
  late: boolean | null;
};

const ATTEMPT_COLUMNS =
  "id, exam_id, question_ids, started_at, deadline, submitted_at, answers, score, total, late";

function toAttempt(row: AttemptRow): ExamAttempt {
  return {
    id: row.id,
    examId: row.exam_id,
    questionIds: row.question_ids,
    startedAt: row.started_at,
    deadline: row.deadline,
    submittedAt: row.submitted_at,
    answers: (row.answers ?? {}) as Record<string, string>,
    score: row.score,
    total: row.total,
    late: row.late ?? false,
  };
}

/** Épreuves de l'utilisateur (la RLS ne montre que les siennes), les plus récentes d'abord. */
export async function getMyExamAttempts(supabase: ServerClient, examId?: string): Promise<ExamAttempt[]> {
  let query = supabase
    .from("exam_attempts")
    .select(ATTEMPT_COLUMNS)
    .order("started_at", { ascending: false });
  if (examId) query = query.eq("exam_id", examId);
  const { data, error } = await query.limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toAttempt);
}

export async function getExamAttempt(supabase: ServerClient, attemptId: string): Promise<ExamAttempt | null> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("id", attemptId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toAttempt(data) : null;
}

/** Épreuve commencée dont le temps n'est pas écoulé. */
export function isRunning(attempt: ExamAttempt): boolean {
  return attempt.submittedAt === null && Date.parse(attempt.deadline) > Date.now();
}

export type ExamQuestion = {
  id: string;
  chapterId: string;
  type: "qcm" | "vrai_faux" | "cas_pratique";
  prompt: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string[];
};

/** Questions d'une épreuve, dans l'ordre tiré (celles devenues invisibles sont omises). */
export async function getExamQuestions(supabase: ServerClient, ids: string[]): Promise<ExamQuestion[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("questions")
    .select("id, chapter_id, type, prompt, options, correct_option, explanation")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const byId = new Map(
    (data ?? []).map((row) => [
      row.id,
      {
        id: row.id,
        chapterId: row.chapter_id,
        type: row.type,
        prompt: row.prompt,
        options: row.options as { id: string; text: string }[],
        correctOption: row.correct_option,
        explanation: row.explanation as string[],
      },
    ]),
  );
  return ids.flatMap((id) => {
    const question = byId.get(id);
    return question ? [question] : [];
  });
}

/** Numéro et titre des chapitres d'une épreuve, pour le détail de la copie corrigée. */
export async function getChapterTitles(
  supabase: ServerClient,
  ids: string[],
): Promise<Map<string, { label: string; title: string; position: number }>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from("chapters").select("id, label, title, position").in("id", ids);
  if (error) throw new Error(error.message);
  return new Map(
    (data ?? []).map((row) => [row.id, { label: row.label, title: row.title, position: row.position }]),
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Identifiant d'épreuve bien formé (une adresse fantaisiste ne doit pas atteindre la base). */
export function isAttemptId(value: string): boolean {
  return UUID.test(value);
}
