"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AdminFormState } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { inspectPdf, UnreadablePdfError } from "@/lib/pdf/watermark";
import { createClient } from "@/lib/supabase/server";

/*
 * Cours en PDF : le fichier est déposé par le navigateur de l'administrateur directement dans le
 * stockage privé (les fichiers lourds ne transitent pas par le serveur du site), puis enregistré ici.
 */

const documentInput = z.object({
  chapterId: z.uuid(),
  title: z.string().trim().max(200, "Titre : 200 caractères au plus."),
  previewPages: z.coerce.number().int().min(0).max(10),
});

export async function registerCourseDocumentAction(input: {
  chapterId: string;
  storagePath: string;
  title: string;
  previewPages: number;
}): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const parsed = documentInput.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Dépôt incomplet ou invalide." };
  const { chapterId, title, previewPages } = parsed.data;
  // Chemin choisi par le formulaire : « <chapitre>/<identifiant aléatoire>.pdf ».
  const fileName = input.storagePath.startsWith(`${chapterId}/`)
    ? input.storagePath.slice(chapterId.length + 1)
    : "";
  if (!/^[0-9a-f-]{36}\.pdf$/.test(fileName))
    return { status: "error", message: "Dépôt incomplet ou invalide." };
  const supabase = await createClient();
  const bucket = supabase.storage.from("cours");

  const download = await bucket.download(input.storagePath);
  if (download.error || !download.data) return { status: "error", message: "Fichier déposé introuvable." };
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  let pageCount: number;
  try {
    ({ pageCount } = await inspectPdf(bytes));
  } catch (error) {
    await bucket.remove([input.storagePath]);
    return {
      status: "error",
      message: error instanceof UnreadablePdfError ? error.message : "PDF illisible.",
    };
  }

  const previousResult = await supabase
    .from("course_documents")
    .select("id, storage_path")
    .eq("chapter_id", chapterId)
    .maybeSingle();
  const previous = previousResult.data;
  const fields = {
    storage_path: input.storagePath,
    title,
    page_count: pageCount,
    preview_pages: previewPages,
    file_size: bytes.byteLength,
    uploaded_by: admin.userId,
    uploaded_at: new Date().toISOString(),
  };
  const saved = previous
    ? await supabase.from("course_documents").update(fields).eq("id", previous.id)
    : await supabase.from("course_documents").insert({ chapter_id: chapterId, ...fields });
  if (saved.error) {
    await bucket.remove([input.storagePath]);
    return { status: "error", message: `Enregistrement impossible : ${saved.error.message}` };
  }
  // L'ancienne version du cours est retirée du stockage.
  if (previous && previous.storage_path !== input.storagePath) await bucket.remove([previous.storage_path]);
  revalidatePath("/admin/cours");
  return {
    status: "ok",
    message: `Cours enregistré : ${pageCount} page${pageCount > 1 ? "s" : ""}.`,
  };
}

export async function updateCourseDocumentAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = documentInput.safeParse({
    chapterId: formData.get("chapterId"),
    title: formData.get("title") ?? "",
    previewPages: formData.get("previewPages"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("course_documents")
    .update({ title: parsed.data.title, preview_pages: parsed.data.previewPages })
    .eq("chapter_id", parsed.data.chapterId);
  if (error) return { status: "error", message: "Enregistrement impossible." };
  revalidatePath("/admin/cours");
  return { status: "ok", message: "Enregistré." };
}

export async function deleteCourseDocumentAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const chapterId = z.uuid().parse(formData.get("chapterId"));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_documents")
    .delete()
    .eq("chapter_id", chapterId)
    .select("storage_path");
  if (error) throw new Error(error.message);
  const paths = (data ?? []).map((row) => row.storage_path);
  if (paths.length) await supabase.storage.from("cours").remove(paths);
  revalidatePath("/admin/cours");
}
