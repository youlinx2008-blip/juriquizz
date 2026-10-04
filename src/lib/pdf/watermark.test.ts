import { PDFDocument, StandardFonts } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { countPages, extractPreview, inspectPdf, toWinAnsi, watermarkPdf } from "./watermark";

async function samplePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Titre d'origine");
  pdf.setAuthor("Auteur d'origine");
  pdf.setProducer("Logiciel d'origine");
  pdf.setCreator("Outil d'origine");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  for (let i = 1; i <= pages; i++) {
    const page = pdf.addPage([595, 842]);
    page.drawText(`Cours d'exemple, page ${i}`, { x: 60, y: 760, size: 18, font });
  }
  return pdf.save();
}

async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({ data: bytes.slice() });
  const document = await task.promise;
  const texts: string[] = [];
  for (let n = 1; n <= document.numPages; n++) {
    const content = await (await document.getPage(n)).getTextContent();
    texts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  await task.destroy();
  return texts;
}

describe("cours en PDF", () => {
  it("porte le nom et l'e-mail du lecteur sur chaque page", async () => {
    const original = await samplePdf(3);
    const marked = await watermarkPdf(original, { name: "Élodie Dupré", email: "elodie@example.com" });
    const texts = await pageTexts(marked);
    expect(texts).toHaveLength(3);
    for (const [index, text] of texts.entries()) {
      expect(text).toContain(`Cours d'exemple, page ${index + 1}`);
      expect(text).toContain("Élodie Dupré - elodie@example.com");
      expect(text).toContain("Exemplaire personnel de Élodie Dupré - elodie@example.com");
      expect(text).toContain("Reproduction et diffusion interdites");
    }
  });

  it("ne transmet pas les métadonnées du fichier d'origine", async () => {
    const marked = await watermarkPdf(
      await samplePdf(1),
      { name: "Élodie Dupré", email: "elodie@example.com" },
      { title: "Chapitre I" },
    );
    const pdf = await PDFDocument.load(marked, { updateMetadata: false });
    expect(pdf.getTitle()).toBe("Chapitre I");
    expect([pdf.getAuthor(), pdf.getProducer(), pdf.getCreator()]).toEqual([
      "JuriQuizz",
      "JuriQuizz",
      "JuriQuizz",
    ]);
  });

  it("ne garde que les premières pages pour l'aperçu", async () => {
    const original = await samplePdf(5);
    const preview = await extractPreview(original, 2, "Chapitre I");
    expect(await countPages(preview)).toBe(2);
    const texts = await pageTexts(preview);
    expect(texts[1]).toContain("page 2");
    expect(texts[1]).toContain("Aperçu gratuit - JuriQuizz");
    expect((await PDFDocument.load(preview, { updateMetadata: false })).getTitle()).toBe(
      "Chapitre I (aperçu)",
    );
    expect(await countPages(await extractPreview(original, 9))).toBe(5);
  });

  it("refuse un fichier qui n'est pas un PDF lisible", async () => {
    await expect(inspectPdf(new TextEncoder().encode("pas un PDF"))).rejects.toThrow("pas un PDF lisible");
    expect(await inspectPdf(await samplePdf(3))).toEqual({ pageCount: 3 });
  });

  it("remplace les caractères que les polices standard ne savent pas écrire", () => {
    expect(toWinAnsi("Zoé Ægir 李")).toBe("Zoé Ægir ?");
    expect(toWinAnsi("l’été")).toBe("l'été");
  });
});
