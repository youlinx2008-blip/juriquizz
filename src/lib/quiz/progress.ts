import type { LevelId } from "@/lib/levels";

export type AttemptRow = {
  chapter_id: string;
  level: LevelId;
  score: number;
  total: number;
  retry: boolean;
  created_at: string;
};

export type LevelProgress = {
  attempts: number;
  best: { score: number; total: number };
  last: { score: number; total: number; at: string };
};

export function progressKey(chapterId: string, level: LevelId): string {
  return `${chapterId}:${level}`;
}

/**
 * Meilleur score et dernier score par chapitre et niveau. Les parties « Refaire mes
 * erreurs » ne comptent pas : elles ne portent que sur une partie du niveau.
 */
export function summarizeAttempts(rows: AttemptRow[]): Map<string, LevelProgress> {
  const result = new Map<string, LevelProgress>();
  const sorted = rows
    .filter((row) => !row.retry && row.total > 0)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const row of sorted) {
    const key = progressKey(row.chapter_id, row.level);
    const current = result.get(key);
    const entry = { score: row.score, total: row.total };
    if (!current) {
      result.set(key, { attempts: 1, best: entry, last: { ...entry, at: row.created_at } });
      continue;
    }
    current.attempts += 1;
    current.last = { ...entry, at: row.created_at };
    if (row.score / row.total >= current.best.score / current.best.total) current.best = entry;
  }
  return result;
}

export type QuestionStatusRow = {
  question_id: string;
  last_correct: boolean;
};

/** Questions dont la dernière réponse était fausse : ce sont les « erreurs à refaire ». */
export function openErrors(statuses: QuestionStatusRow[], visibleIds: Iterable<string>): Set<string> {
  const visible = new Set(visibleIds);
  return new Set(
    statuses.filter((s) => !s.last_correct && visible.has(s.question_id)).map((s) => s.question_id),
  );
}
