import type { NextRequest } from "next/server";
import { openedOutsideReader, pdfResponse, problem, readOriginal, UUID } from "@/lib/pdf/serve";
import { extractPreview } from "@/lib/pdf/watermark";
import { createClient } from "@/lib/supabase/server";

/** Aperçu gratuit d'un cours (couverture, sommaire) : les premières pages seulement, pour tous. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/apercu/[document]">) {
  const { document } = await ctx.params;
  if (!UUID.test(document)) return problem(404, "Aperçu introuvable.");
  if (openedOutsideReader(request)) return problem(403, "Cet aperçu se lit dans JuriQuizz.");

  // La RLS ne montre que les cours des matières publiées.
  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("course_documents")
    .select("storage_path, title, preview_pages")
    .eq("id", document)
    .maybeSingle();
  if (error) return problem(500, "Aperçu indisponible pour l’instant.");
  if (!course || course.preview_pages === 0) return problem(404, "Aperçu introuvable.");
  try {
    const preview = await extractPreview(
      await readOriginal(course.storage_path),
      course.preview_pages,
      course.title,
    );
    // Cache du navigateur seulement, et court : une matière masquée disparaît vite des aperçus.
    return pdfResponse(preview, "private, max-age=60");
  } catch (cause) {
    console.error("Préparation de l'aperçu impossible :", cause);
    return problem(500, "Aperçu indisponible pour l’instant.");
  }
}
