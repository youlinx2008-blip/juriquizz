"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ExamStartState = { status: "idle" } | { status: "error"; message: string };

const START_ERRORS: Record<string, string> = {
  "28000": "Connecte-toi pour passer l’examen.",
  "42501": "Les examens blancs sont réservés aux détenteurs d’un pass.",
  JQ402: "Cet examen blanc est réservé au Pass Année Premium.",
  JQ422: "Pas encore assez de questions disponibles pour cet examen.",
  P0002: "Examen introuvable.",
  "54000": "Tu as commencé beaucoup d’épreuves aujourd’hui : réessaie demain.",
};

/** Début (ou reprise) d'une épreuve : la base tire les questions et fixe l'heure de fin. */
export async function startExamAction(_prev: ExamStartState, formData: FormData): Promise<ExamStartState> {
  const examId = z.uuid().safeParse(formData.get("examId"));
  const back = String(formData.get("back") ?? "");
  if (!examId.success || !back.startsWith("/examens/"))
    return { status: "error", message: "Examen introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_mock_exam", { p_exam_id: examId.data });
  if (error) {
    return {
      status: "error",
      message: START_ERRORS[error.code] ?? "L’épreuve n’a pas pu commencer. Réessaie.",
    };
  }
  redirect(back);
}

/**
 * Copie rendue : la note est calculée par la base, puis la copie corrigée s'affiche. Sans réseau,
 * la copie reste dans le navigateur et peut être renvoyée.
 */
export async function submitExamAction(
  attemptId: string,
  answers: Record<string, string>,
  resultHref: string,
): Promise<{ ok: false; message: string }> {
  const id = z.uuid().safeParse(attemptId);
  // Une réponse par question de l'épreuve (100 au plus) : rien de plus n'est transmis à la base.
  const parsed = z
    .record(z.string().max(120), z.string().max(4))
    .refine((value) => Object.keys(value).length <= 100)
    .safeParse(answers);
  if (!id.success || !parsed.success || !resultHref.startsWith("/examens/")) {
    return { ok: false, message: "Copie invalide." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_mock_exam", { p_attempt_id: id.data, p_answers: parsed.data });
  if (error)
    return { ok: false, message: "La copie n’a pas pu être envoyée. Vérifie ta connexion et réessaie." };
  redirect(resultHref);
}
