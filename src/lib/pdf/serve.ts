import "server-only";
import { READER_HEADER } from "@/lib/pdf/reader";
import { createServiceClient } from "@/lib/supabase/service";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Les cours se lisent dans le lecteur de JuriQuizz : une ouverture directe du fichier (onglet, cadre,
 * lien d'un autre site) est refusée, ce qui écarte la visionneuse du navigateur et son bouton
 * d'enregistrement.
 */
export function openedOutsideReader(request: Request): boolean {
  const dest = request.headers.get("sec-fetch-dest");
  const site = request.headers.get("sec-fetch-site");
  return (
    request.headers.get(READER_HEADER) !== "1" ||
    (dest !== null && dest !== "empty") ||
    (site !== null && site !== "same-origin")
  );
}

/** Fichier original, lu dans le stockage privé avec la clé du serveur. */
export async function readOriginal(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await createServiceClient().storage.from("cours").download(storagePath);
  if (error || !data) throw new Error(`Lecture du cours impossible : ${error?.message ?? "fichier absent"}`);
  return new Uint8Array(await data.arrayBuffer());
}

const CHUNK = 256 * 1024;

/**
 * Réponse envoyée en flux, par morceaux : l'hébergement limite la taille des réponses d'un bloc
 * (4,5 Mo chez Vercel), pas celle des réponses en flux.
 */
export function pdfResponse(bytes: Uint8Array, cacheControl: string): Response {
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.subarray(offset, offset + CHUNK));
      offset += CHUNK;
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="cours.pdf"',
      "Cache-Control": cacheControl,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function problem(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
