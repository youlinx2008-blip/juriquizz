import type { NextRequest } from "next/server";
import { openedOutsideReader, pdfResponse, problem, readOriginal, UUID } from "@/lib/pdf/serve";
import { watermarkPdf } from "@/lib/pdf/watermark";
import { createClient } from "@/lib/supabase/server";

const REFUSALS: Record<string, [number, string]> = {
  "28000": [401, "Connecte-toi pour lire ce cours."],
  "42501": [403, "Ce cours est réservé aux détenteurs d’un pass."],
  JQ402: [403, "Ce cours fait partie des exclusivités du Pass Année Premium."],
  JQ428: [428, "Indique ton nom avant d’ouvrir les cours."],
  P0002: [404, "Cours introuvable."],
  "54000": [429, "Tu as ouvert beaucoup de cours aujourd’hui : réessaie demain."],
};

/** Cours en PDF, avec le nom et l'adresse e-mail du lecteur imprimés sur chaque page. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/cours/[document]">) {
  const { document } = await ctx.params;
  if (!UUID.test(document)) return problem(404, "Cours introuvable.");
  if (openedOutsideReader(request)) return problem(403, "Ce cours se lit dans JuriQuizz.");

  const supabase = await createClient();
  // Vérifie l'accès, la visibilité de la matière et la limite quotidienne, puis consigne la lecture.
  const { data, error } = await supabase.rpc("authorize_pdf_view", { p_document_id: document });
  if (error) {
    const [status, message] = REFUSALS[error.code] ?? [500, "Lecture impossible pour l’instant."];
    if (status === 500) console.error("Autorisation de lecture impossible :", error.message);
    return problem(status, message);
  }
  const grant = data as { storage_path: string; title: string; full_name: string; email: string };
  try {
    const marked = await watermarkPdf(
      await readOriginal(grant.storage_path),
      { name: grant.full_name, email: grant.email },
      { title: grant.title },
    );
    return pdfResponse(marked, "private, no-store");
  } catch (cause) {
    console.error("Préparation du cours impossible :", cause);
    return problem(500, "Lecture impossible pour l’instant.");
  }
}
