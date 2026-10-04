"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AdminFormState } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/content/source";
import { LEVEL_IDS } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

/*
 * Administration des examens blancs. La base vérifie elle aussi que l'appelant est administrateur,
 * qu'un examen publié ne passe pas en Premium et qu'il ne se supprime pas.
 */

function refreshExams() {
  revalidatePath("/admin/examens");
  revalidatePath("/examens", "layout");
  revalidatePath("/tarifs", "layout");
}

const examSchema = z.object({
  id: z.uuid().optional(),
  subjectId: z.uuid("Choisis une matière."),
  title: z.string().trim().min(1, "Titre requis.").max(120, "Titre : 120 caractères au plus."),
  slug: z.string().trim().max(60, "Adresse : 60 caractères au plus."),
  description: z.string().trim().max(500, "Description : 500 caractères au plus."),
  questionCount: z.coerce
    .number("Nombre de questions invalide.")
    .int()
    .min(5, "5 questions au moins.")
    .max(100, "100 questions au plus."),
  durationMinutes: z.coerce
    .number("Durée invalide.")
    .int()
    .min(5, "5 minutes au moins.")
    .max(240, "4 heures au plus."),
  levels: z.array(z.enum(LEVEL_IDS)).min(1, "Choisis au moins un niveau."),
  chapterIds: z.array(z.uuid()).max(200),
  position: z.coerce.number().int().min(0).max(1000).default(0),
});

const ERRORS: Record<string, string> = {
  "23505": "Un autre examen de cette matière a déjà cette adresse : choisis-en une autre.",
  JQ403: "Un examen déjà publié ne passe pas en Premium : il a pu être vendu sans.",
  "23514": "Valeur refusée par la base (vérifie le nombre de questions, la durée et les niveaux).",
};

export async function saveExamAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = examSchema.safeParse({
    id: formData.get("id") || undefined,
    subjectId: formData.get("subjectId"),
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    questionCount: formData.get("questionCount"),
    durationMinutes: formData.get("durationMinutes"),
    levels: formData.getAll("levels"),
    chapterIds: formData.getAll("chapterIds"),
    position: formData.get("position") || 0,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const input = parsed.data;
  const slug = slugify(input.slug || input.title)
    .slice(0, 60)
    .replace(/-+$/, "");
  if (!slug) return { status: "error", message: "Adresse invalide : lettres ou chiffres attendus." };

  const supabase = await createClient();
  // Chapitres retenus : seulement ceux de la matière de l'examen.
  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("id")
    .eq("subject_id", input.subjectId);
  if (chaptersError) return { status: "error", message: chaptersError.message };
  const ofSubject = new Set((chapters ?? []).map((chapter) => chapter.id));
  const chapterIds = input.chapterIds.filter((id) => ofSubject.has(id));
  if (chapterIds.length !== input.chapterIds.length) {
    return { status: "error", message: "Des chapitres choisis n’appartiennent pas à cette matière." };
  }

  const fields = {
    slug,
    title: input.title,
    description: input.description,
    question_count: input.questionCount,
    duration_minutes: input.durationMinutes,
    levels: input.levels,
    // Aucun chapitre coché : toute la matière, y compris les chapitres ajoutés plus tard.
    chapter_ids: chapterIds,
    premium: formData.get("premium") === "on",
    visible: formData.get("visible") === "on",
    position: input.position,
  };
  const { error } = input.id
    ? await supabase.from("mock_exams").update(fields).eq("id", input.id)
    : await supabase.from("mock_exams").insert({ ...fields, subject_id: input.subjectId });
  if (error)
    return { status: "error", message: ERRORS[error.code] ?? `Enregistrement impossible : ${error.message}` };
  refreshExams();
  return { status: "ok", message: input.id ? "Examen enregistré." : "Examen créé." };
}

/** Suppression d'un examen jamais publié ; un examen publié se masque. */
export async function deleteExamAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Examen introuvable." };
  const supabase = await createClient();
  const { error, count } = await supabase.from("mock_exams").delete({ count: "exact" }).eq("id", id.data);
  if (error) return { status: "error", message: `Suppression impossible : ${error.message}` };
  if (!count) {
    return {
      status: "error",
      message:
        "Un examen déjà publié ne se supprime pas (copies des étudiants) : décoche « Proposé aux étudiants ».",
    };
  }
  refreshExams();
  return { status: "ok", message: "Examen supprimé." };
}
