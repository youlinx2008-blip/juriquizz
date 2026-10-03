import { z } from "zod";
import { DECOR_KEYS, DECORS } from "@/lib/decors/registry";
import { LEVEL_IDS } from "@/lib/levels";

/**
 * Format des fichiers de contenu (une matière par fichier), tel qu'écrit par l'auteur.
 * Ajouter une matière ou un chapitre ne demande qu'un nouveau fichier, pas de code.
 */

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "identifiant attendu en minuscules, chiffres et tirets");

const decorKey = z.enum(DECOR_KEYS);
const reviewStatus = z.enum(["a_relire", "relue", "a_corriger"]);
const nonEmpty = z.string().trim().min(1, "texte vide");

const optionSchema = z.object({
  id: z.string().min(1),
  texte: nonEmpty,
});

export const sourceQuestionSchema = z.object({
  id: slug,
  ordre_cours: z.number().int().nonnegative(),
  type: z.enum(["qcm", "vrai_faux", "cas_pratique"]),
  decor: decorKey.nullish(),
  enonce: nonEmpty,
  options: z.array(optionSchema).min(2).max(6),
  bonne_reponse: z.string().min(1),
  indice: z.string().trim().nullish(),
  explication: z.array(nonEmpty).min(1),
  relecture: reviewStatus.optional(),
});

export const sourceChapterSchema = z.object({
  id: slug,
  numero: z.string().trim().min(1),
  libelle: nonEmpty,
  titre: nonEmpty,
  decor_par_defaut: decorKey,
  resume: z.string().trim().default(""),
  niveaux: z.partialRecord(z.enum(LEVEL_IDS), z.array(sourceQuestionSchema)),
});

export const sourceSubjectSchema = z.object({
  /** Identifiant de la matière ; à défaut, il est tiré du titre. */
  id: slug.optional(),
  cours: nonEmpty,
  niveaux: z
    .array(z.object({ id: z.string(), label: z.string(), objectif: z.string().optional() }))
    .optional(),
  decors: z
    .record(z.string(), z.object({ label: z.string().optional(), accent_clair: z.string(), accent_sombre: z.string() }))
    .optional(),
  statut_relecture_par_defaut: reviewStatus.default("a_relire"),
  chapitres: z.array(sourceChapterSchema).min(1),
});

export type SourceSubject = z.infer<typeof sourceSubjectSchema>;
export type SourceChapter = z.infer<typeof sourceChapterSchema>;
export type SourceQuestion = z.infer<typeof sourceQuestionSchema>;

export type ContentIssue = { path: string; message: string };

export type ValidationResult =
  | { ok: true; subject: SourceSubject; warnings: ContentIssue[] }
  | { ok: false; errors: ContentIssue[]; warnings: ContentIssue[] };

const LETTERS = ["a", "b", "c", "d", "e", "f"];

/** Valide un fichier de contenu : forme générale, puis règles propres au quiz. */
export function validateSource(input: unknown): ValidationResult {
  const parsed = sourceSubjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      warnings: [],
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const subject = parsed.data;
  const errors: ContentIssue[] = [];
  const warnings: ContentIssue[] = [];
  const questionIds = new Set<string>();
  const chapterIds = new Set<string>();

  for (const level of subject.niveaux ?? []) {
    if (!(LEVEL_IDS as readonly string[]).includes(level.id)) {
      errors.push({ path: "niveaux", message: `niveau inconnu : ${level.id}` });
    }
  }

  for (const [key, decor] of Object.entries(subject.decors ?? {})) {
    if (!(DECOR_KEYS as readonly string[]).includes(key)) {
      errors.push({ path: `decors.${key}`, message: `décor inconnu : ${key}` });
      continue;
    }
    const known = DECORS[key as keyof typeof DECORS];
    if (
      known.accentLight.toLowerCase() !== decor.accent_clair.toLowerCase() ||
      known.accentDark.toLowerCase() !== decor.accent_sombre.toLowerCase()
    ) {
      warnings.push({
        path: `decors.${key}`,
        message: "couleurs d'accent différentes de celles de l'application (ignorées)",
      });
    }
  }

  subject.chapitres.forEach((chapter, ci) => {
    const chapterPath = `chapitres.${ci}(${chapter.id})`;
    if (chapterIds.has(chapter.id)) {
      errors.push({ path: chapterPath, message: `chapitre en double : ${chapter.id}` });
    }
    chapterIds.add(chapter.id);

    for (const levelId of LEVEL_IDS) {
      const questions = chapter.niveaux[levelId] ?? [];
      questions.forEach((question, qi) => {
        const path = `${chapterPath}.niveaux.${levelId}.${qi}(${question.id})`;
        if (questionIds.has(question.id)) {
          errors.push({ path, message: `identifiant de question en double : ${question.id}` });
        }
        questionIds.add(question.id);

        const ids = question.options.map((option) => option.id);
        if (question.type === "vrai_faux") {
          if (ids.length !== 2 || ids[0] !== "v" || ids[1] !== "f") {
            errors.push({ path, message: "un vrai/faux doit avoir les options v puis f" });
          }
        } else {
          const expected = LETTERS.slice(0, ids.length);
          if (ids.some((id, index) => id !== expected[index])) {
            errors.push({ path, message: `options attendues dans l'ordre ${expected.join(", ")}` });
          }
        }
        if (!ids.includes(question.bonne_reponse)) {
          errors.push({ path, message: `bonne réponse « ${question.bonne_reponse} » absente des options` });
        }
        if (!question.indice) {
          warnings.push({ path, message: "pas d'indice" });
        }
      });
    }
  });

  return errors.length ? { ok: false, errors, warnings } : { ok: true, subject, warnings };
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
