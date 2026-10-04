"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parisEndOfDay } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

/*
 * Actions d'administration. Chaque fonction de la base vérifie elle-même que l'appelant
 * est administrateur : ces actions ne font que transmettre.
 */

export type AdminFormState =
  { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

const reviewStatus = z.enum(["a_relire", "relue", "a_corriger"]);

export async function setSubjectVisibilityAction(formData: FormData): Promise<void> {
  const subjectId = z.uuid().parse(formData.get("subjectId"));
  const visible = formData.get("visible") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_subject_visibility", {
    p_subject_id: subjectId,
    p_visible: visible,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/matieres");
}

export async function setReviewStatusAction(formData: FormData): Promise<void> {
  const questionId = z.string().min(1).max(120).parse(formData.get("questionId"));
  const status = reviewStatus.parse(formData.get("status"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_review_status", {
    p_question_id: questionId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${questionId}`);
}

export async function resolveFeedbackAction(formData: FormData): Promise<void> {
  const feedbackId = z.uuid().parse(formData.get("feedbackId"));
  const resolved = formData.get("resolved") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_feedback", {
    p_feedback_id: feedbackId,
    p_resolved: resolved,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/retours");
  const questionId = formData.get("questionId");
  if (typeof questionId === "string") revalidatePath(`/admin/questions/${questionId}`);
}

export async function setCodeDisabledAction(formData: FormData): Promise<void> {
  const code = z.string().min(1).max(40).parse(formData.get("code"));
  const disabled = formData.get("disabled") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_beta_code_disabled", {
    p_code: code,
    p_disabled: disabled,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/codes");
}

const createCodesSchema = z.object({
  count: z.coerce.number().int().min(1, "Au moins 1 code.").max(200, "200 codes au plus."),
  usesMax: z.coerce.number().int().min(1, "Au moins 1 utilisation.").max(10000),
  label: z.string().trim().max(120).default(""),
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{0,12}$/, "Préfixe : lettres et chiffres seulement.")
    .default("JQ"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^$|^[A-Z0-9]+(-[A-Z0-9]+)*$/, "Code : lettres, chiffres et tirets.")
    .default(""),
  expiresAt: z.string().default(""),
  accessEndsAt: z.string().default(""),
});

export async function createCodesAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const parsed = createCodesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const input = parsed.data;
  if (input.code && input.code.length < 6)
    return { status: "error", message: "Un code choisi fait au moins 6 caractères." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_beta_codes", {
    p_count: input.code ? 1 : input.count,
    p_uses_max: input.usesMax,
    p_label: input.label,
    // Une date limite « 31 janvier » couvre toute la journée, heure de Paris.
    p_expires_at: parisEndOfDay(input.expiresAt) ?? undefined,
    p_access_ends_at: parisEndOfDay(input.accessEndsAt) ?? undefined,
    p_prefix: input.prefix,
    p_code: input.code || undefined,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? "Ce code existe déjà." : "Création impossible : " + error.message,
    };
  }
  revalidatePath("/admin/codes");
  redirect(`/admin/codes?nouveaux=${encodeURIComponent((data ?? []).map((row) => row.code).join(","))}`);
}

/** Chapitre réservé (ou non) au Pass Année Premium : seulement avant sa publication pour le réserver. */
export async function setChapterPremiumAction(formData: FormData): Promise<void> {
  const chapterId = z.uuid().parse(formData.get("chapterId"));
  const premium = formData.get("premium") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_chapter_premium", {
    p_chapter_id: chapterId,
    p_premium: premium,
  });
  if (error && error.code !== "JQ403") throw new Error(error.message);
  revalidatePath("/admin/matieres");
  revalidatePath("/cours", "layout");
  revalidatePath("/tarifs", "layout");
}
