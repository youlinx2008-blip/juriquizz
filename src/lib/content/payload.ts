import { LEVEL_IDS, type LevelId } from "@/lib/levels";
import type { DecorKey } from "@/lib/decors/registry";
import { slugify, type SourceSubject } from "./source";

/** Forme attendue par la fonction SQL import_subject. */
export type ImportPayload = {
  subject: { slug: string; title: string };
  chapters: ImportChapter[];
};

export type ImportChapter = {
  slug: string;
  number: string;
  label: string;
  title: string;
  summary: string;
  default_decor: DecorKey;
  position: number;
  /** Absent : le chapitre garde son réglage actuel. */
  premium?: boolean;
  questions: ImportQuestion[];
};

export type ImportQuestion = {
  id: string;
  level: LevelId;
  position: number;
  course_order: number;
  type: "qcm" | "vrai_faux" | "cas_pratique";
  decor: DecorKey | null;
  prompt: string;
  options: { id: string; text: string }[];
  correct_option: string;
  hint: string | null;
  explanation: string[];
  review_status: "a_relire" | "relue" | "a_corriger";
};

/**
 * Convertit un fichier validé. L'ordre des chapitres, des niveaux, des questions et
 * des options est exactement celui du fichier.
 */
export function toImportPayload(source: SourceSubject): ImportPayload {
  return {
    subject: { slug: source.id ?? slugify(source.cours), title: source.cours },
    chapters: source.chapitres.map((chapter, chapterIndex) => ({
      slug: chapter.id,
      number: chapter.numero,
      label: chapter.libelle,
      title: chapter.titre,
      summary: chapter.resume,
      default_decor: chapter.decor_par_defaut,
      position: chapterIndex,
      ...(chapter.premium === undefined ? {} : { premium: chapter.premium }),
      questions: LEVEL_IDS.flatMap((level) =>
        (chapter.niveaux[level] ?? []).map((question, index) => ({
          id: question.id,
          level,
          position: index,
          course_order: question.ordre_cours,
          type: question.type,
          decor: question.decor ?? null,
          prompt: question.enonce,
          options: question.options.map((option) => ({ id: option.id, text: option.texte })),
          correct_option: question.bonne_reponse,
          hint: question.indice ? question.indice : null,
          explanation: question.explication,
          review_status: question.relecture ?? source.statut_relecture_par_defaut,
        })),
      ),
    })),
  };
}

export function countQuestions(payload: ImportPayload): number {
  return payload.chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0);
}
