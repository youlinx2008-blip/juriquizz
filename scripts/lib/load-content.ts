import { readFileSync } from "node:fs";
import { countQuestions, toImportPayload, type ImportPayload } from "../../src/lib/content/payload";
import { validateSource, type ContentIssue } from "../../src/lib/content/source";

export function loadContentFile(path: string): { payload: ImportPayload; warnings: ContentIssue[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Lecture impossible de ${path} : ${(error as Error).message}`);
  }
  const result = validateSource(raw);
  if (!result.ok) {
    const lines = result.errors.map((issue) => `  - ${issue.path} : ${issue.message}`);
    throw new Error(`Fichier ${path} invalide :\n${lines.join("\n")}`);
  }
  return { payload: toImportPayload(result.subject), warnings: result.warnings };
}

export function describePayload(payload: ImportPayload): string {
  const lines = [`Matière « ${payload.subject.title} » (${payload.subject.slug})`];
  for (const chapter of payload.chapters) {
    const byLevel = new Map<string, number>();
    for (const question of chapter.questions) {
      byLevel.set(question.level, (byLevel.get(question.level) ?? 0) + 1);
    }
    const detail = [...byLevel.entries()].map(([level, n]) => `${level} ${n}`).join(", ");
    lines.push(`  ${chapter.label} : ${chapter.title} (${detail || "aucune question"})`);
  }
  lines.push(`  Total : ${countQuestions(payload)} questions`);
  return lines.join("\n");
}
