import "server-only";
import {
  degrees,
  EncryptedPDFError,
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

/** Les polices standard des PDF ne connaissent que l'alphabet Windows-1252 : on remplace le reste. */
export function toWinAnsi(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E -ÿŒœŠšŸŽž€–—…]/g, "?");
}

export type Reader = { name: string; email: string };

/** Ligne discrète centrée en bas de page. */
function drawFooter(page: PDFPage, font: PDFFont, text: string) {
  const size = 7;
  const { width } = page.getSize();
  page.drawText(text, {
    x: Math.max(12, (width - font.widthOfTextAtSize(text, size)) / 2),
    y: 10,
    size,
    font,
    color: rgb(0.3, 0.3, 0.3),
    opacity: 0.85,
  });
}

/** Les métadonnées du fichier d'origine (auteur, logiciel de création…) ne sont pas transmises. */
function setOwnMetadata(pdf: PDFDocument, title: string, subject: string) {
  pdf.catalog.delete(PDFName.of("Metadata"));
  pdf.setTitle(title || "Cours");
  pdf.setSubject(subject);
  pdf.setAuthor("JuriQuizz");
  pdf.setKeywords([]);
  pdf.setProducer("JuriQuizz");
  pdf.setCreator("JuriQuizz");
}

/**
 * Filigrane personnel sur chaque page : nom et e-mail du lecteur en diagonale, et une ligne en pied
 * de page. Le fichier d'origine n'est pas modifié ; une copie filigranée est produite à chaque lecture.
 */
export async function watermarkPdf(
  original: Uint8Array,
  reader: Reader,
  options: { title?: string; at?: Date } = {},
): Promise<Uint8Array> {
  const at = options.at ?? new Date();
  const pdf = await PDFDocument.load(original);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const who = toWinAnsi(reader.name ? `${reader.name} - ${reader.email}` : reader.email);
  const date = at.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  const footer = toWinAnsi(`Exemplaire personnel de ${who} - ${date} - Reproduction et diffusion interdites`);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const diagonalSize = Math.max(10, Math.min(28, (width * 0.9) / Math.max(who.length, 1) / 0.5));
    const textWidth = font.widthOfTextAtSize(who, diagonalSize);
    const angle = Math.atan2(height, width);
    page.drawText(who, {
      x: width / 2 - (textWidth / 2) * Math.cos(angle),
      y: height / 2 - (textWidth / 2) * Math.sin(angle),
      size: diagonalSize,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.16,
      rotate: degrees((angle * 180) / Math.PI),
    });
    drawFooter(page, font, footer);
  }
  setOwnMetadata(pdf, options.title ?? "", `Exemplaire personnel de ${who}`);
  return pdf.save();
}

/** Aperçu gratuit : les premières pages seulement (couverture, sommaire). */
export async function extractPreview(original: Uint8Array, pages: number, title = ""): Promise<Uint8Array> {
  const source = await PDFDocument.load(original);
  const preview = await PDFDocument.create();
  const count = Math.min(pages, source.getPageCount());
  const copied = await preview.copyPages(
    source,
    Array.from({ length: count }, (_, index) => index),
  );
  const font = await preview.embedFont(StandardFonts.Helvetica);
  const footer = toWinAnsi(
    "Aperçu gratuit - JuriQuizz - La suite du cours est réservée aux détenteurs d'un pass",
  );
  copied.forEach((page) => drawFooter(preview.addPage(page), font, footer));
  setOwnMetadata(preview, `${title || "Cours"} (aperçu)`, "Aperçu gratuit");
  return preview.save();
}

export class UnreadablePdfError extends Error {}

/**
 * Contrôle d'un fichier déposé : un PDF lisible, sans mot de passe (un fichier chiffré ne peut pas
 * recevoir de filigrane). Renvoie son nombre de pages.
 */
export async function inspectPdf(bytes: Uint8Array): Promise<{ pageCount: number }> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes);
  } catch (error) {
    throw new UnreadablePdfError(
      error instanceof EncryptedPDFError
        ? "Ce PDF est protégé (mot de passe ou restrictions) : dépose une version sans protection."
        : "Ce fichier n'est pas un PDF lisible.",
    );
  }
  const pageCount = pdf.getPageCount();
  if (pageCount === 0) throw new UnreadablePdfError("Ce PDF ne contient aucune page.");
  return { pageCount };
}

export async function countPages(bytes: Uint8Array): Promise<number> {
  return (await inspectPdf(bytes)).pageCount;
}
