import "server-only";
import type { ServerClient } from "@/lib/supabase/server";

/** Fiche d'un cours en PDF (le fichier lui-même reste dans le stockage privé). */
export type CourseDocument = {
  id: string;
  chapterId: string;
  title: string;
  pageCount: number;
  previewPages: number;
  fileSize: number;
  uploadedAt: string;
};

type Row = {
  id: string;
  chapter_id: string;
  title: string;
  page_count: number;
  preview_pages: number;
  file_size: number;
  uploaded_at: string;
};

const COLUMNS = "id, chapter_id, title, page_count, preview_pages, file_size, uploaded_at";

function toDocument(row: Row): CourseDocument {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    title: row.title,
    pageCount: row.page_count,
    previewPages: row.preview_pages,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
  };
}

/** Cours en PDF des chapitres donnés (visibles selon la RLS : matière publiée, ou administration). */
export async function getDocuments(
  supabase: ServerClient,
  chapterIds: string[],
): Promise<Map<string, CourseDocument>> {
  if (chapterIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("course_documents")
    .select(COLUMNS)
    .in("chapter_id", chapterIds);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.chapter_id, toDocument(row)]));
}

export async function getDocument(supabase: ServerClient, chapterId: string): Promise<CourseDocument | null> {
  return (await getDocuments(supabase, [chapterId])).get(chapterId) ?? null;
}

/** « 1,2 Mo » */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}
