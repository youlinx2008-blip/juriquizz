"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AdminFormState } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { parisEndOfDay } from "@/lib/dates";
import { parseEuros } from "@/lib/money";
import { isPassPlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

/*
 * Administration de la vente : offres, dates des partiels, fin de la bêta, textes légaux, démonstration.
 * La base vérifie elle aussi que l'appelant est administrateur (RLS et fonctions).
 */

function refreshSales() {
  revalidatePath("/admin/vente");
  revalidatePath("/tarifs");
}

export async function updatePlanAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const plan = formData.get("plan");
  if (!isPassPlan(plan)) return { status: "error", message: "Offre inconnue." };
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = parseEuros(String(formData.get("price") ?? ""));
  const promoInput = String(formData.get("promoPrice") ?? "").trim();
  const promoPrice = promoInput ? parseEuros(promoInput) : null;
  const promoDate = String(formData.get("promoUntil") ?? "").trim();
  const promoUntil = promoDate ? parisEndOfDay(promoDate) : null;

  if (!label || label.length > 60) return { status: "error", message: "Nom : 1 à 60 caractères." };
  if (description.length > 300) return { status: "error", message: "Description : 300 caractères au plus." };
  if (price === null || price < 50) return { status: "error", message: "Prix invalide (0,50 € au moins)." };
  if (promoInput && (promoPrice === null || promoPrice < 50 || promoPrice >= price)) {
    return { status: "error", message: "Le prix de lancement doit être inférieur au prix habituel." };
  }
  if (promoDate && !promoUntil)
    return { status: "error", message: "Date de fin du prix de lancement invalide." };
  if (promoPrice !== null && !promoUntil) {
    return { status: "error", message: "Indique jusqu’à quand s’applique le prix de lancement." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({
      label,
      description,
      price_cents: price,
      promo_price_cents: promoPrice,
      promo_until: promoPrice === null ? null : promoUntil,
      on_sale: formData.get("onSale") === "on",
    })
    .eq("id", plan);
  if (error) return { status: "error", message: `Enregistrement impossible : ${error.message}` };
  refreshSales();
  return { status: "ok", message: "Offre enregistrée." };
}

const examSession = z.object({
  academicYear: z
    .string()
    .trim()
    .regex(/^(\d{4})-(\d{4})$/, "Année universitaire au format 2026-2027.")
    .refine(
      (value) => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1,
      "Années consécutives attendues.",
    ),
  label: z.string().trim().min(1, "Libellé requis.").max(80),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin requise."),
});

export async function addExamSessionAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = examSession.safeParse({
    academicYear: formData.get("academicYear"),
    label: formData.get("label"),
    endsOn: formData.get("endsOn"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const endsAt = parisEndOfDay(parsed.data.endsOn);
  if (!endsAt) return { status: "error", message: "Date invalide." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_sessions")
    .insert({ academic_year: parsed.data.academicYear, label: parsed.data.label, ends_at: endsAt });
  if (error?.code === "23505") {
    return {
      status: "error",
      message: "Cette session existe déjà pour cette année : supprime-la pour la corriger.",
    };
  }
  if (error) return { status: "error", message: `Enregistrement impossible : ${error.message}` };
  refreshSales();
  return { status: "ok", message: "Session de partiels ajoutée." };
}

export async function deleteExamSessionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("exam_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refreshSales();
}

export async function setBetaEndAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const endsAt = parisEndOfDay(String(formData.get("betaEnd") ?? ""));
  if (!endsAt) return { status: "error", message: "Choisis une date." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_set_beta_end", { p_ends_at: endsAt });
  if (error) {
    return {
      status: "error",
      message: error.code === "22023" ? "La fin de la bêta doit être dans le futur." : error.message,
    };
  }
  revalidatePath("/admin/vente");
  revalidatePath("/admin/codes");
  return { status: "ok", message: `Fin de la bêta enregistrée : ${data} accès testeur(s) ajusté(s).` };
}

const LEGAL_SLUGS = ["cgu", "cgv", "mentions-legales", "confidentialite"] as const;

export async function updateLegalPageAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = z
    .object({
      slug: z.enum(LEGAL_SLUGS),
      title: z.string().trim().min(1, "Titre requis.").max(120),
      body: z.string().trim().min(1, "Texte requis.").max(60_000, "Texte trop long."),
    })
    .safeParse({ slug: formData.get("slug"), title: formData.get("title"), body: formData.get("body") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_update_legal_page", {
    p_slug: parsed.data.slug,
    p_title: parsed.data.title,
    p_body: parsed.data.body.replace(/\r\n/g, "\n"),
  });
  if (error) return { status: "error", message: `Enregistrement impossible : ${error.message}` };
  revalidatePath("/admin/textes");
  revalidatePath(`/${parsed.data.slug}`);
  refreshSales();
  const remaining = (parsed.data.body.match(/\[À COMPLÉTER/g) ?? []).length;
  return {
    status: "ok",
    message: `Version ${data} enregistrée.${remaining ? ` Il reste ${remaining} passage(s) à compléter.` : ""}`,
  };
}

export async function setQuestionDemoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const questionId = z.string().min(1).max(120).parse(formData.get("questionId"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_question_demo", {
    p_question_id: questionId,
    p_demo: formData.get("demo") === "true",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${questionId}`);
}
