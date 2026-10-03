import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { countQuestions, toImportPayload } from "./payload";
import { slugify, validateSource } from "./source";

const fixture = JSON.parse(readFileSync("tests/fixtures/matiere-exemple.json", "utf8"));
const REAL_FILE = "content/questions.json";

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe("validateSource", () => {
  it("accepte la matière d'exemple", () => {
    const result = validateSource(fixture);
    expect(result.ok).toBe(true);
  });

  it("refuse une bonne réponse absente des options", () => {
    const data = clone(fixture);
    data.chapitres[0].niveaux.facile[0].bonne_reponse = "e";
    const result = validateSource(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].message).toMatch(/absente des options/);
  });

  it("refuse un vrai/faux sans les options v puis f", () => {
    const data = clone(fixture);
    data.chapitres[0].niveaux.facile[1].options.reverse();
    expect(validateSource(data).ok).toBe(false);
  });

  it("refuse des options de QCM dans le désordre", () => {
    const data = clone(fixture);
    data.chapitres[0].niveaux.facile[0].options[0].id = "z";
    expect(validateSource(data).ok).toBe(false);
  });

  it("refuse un identifiant de question en double", () => {
    const data = clone(fixture);
    data.chapitres[1].niveaux.facile[0].id = data.chapitres[0].niveaux.facile[0].id;
    const result = validateSource(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => /en double/.test(e.message))).toBe(true);
  });

  it("refuse un décor inconnu", () => {
    const data = clone(fixture);
    data.chapitres[0].niveaux.facile[0].decor = "jungle";
    expect(validateSource(data).ok).toBe(false);
  });

  it("refuse un niveau inconnu", () => {
    const data = clone(fixture);
    data.chapitres[0].niveaux.expert = [];
    expect(validateSource(data).ok).toBe(false);
  });

  it("refuse une explication vide", () => {
    const data = clone(fixture);
    data.chapitres[0].niveaux.facile[0].explication = [];
    expect(validateSource(data).ok).toBe(false);
  });
});

describe("toImportPayload", () => {
  it("conserve l'ordre du fichier et le statut de relecture par défaut", () => {
    const result = validateSource(fixture);
    if (!result.ok) throw new Error("fixture invalide");
    const payload = toImportPayload(result.subject);
    expect(payload.subject).toEqual({ slug: "matiere-exemple", title: "Matière d'exemple" });
    expect(payload.chapters.map((c) => c.slug)).toEqual(["decouverte", "methode"]);
    expect(countQuestions(payload)).toBe(12);
    const facile = payload.chapters[0].questions.filter((q) => q.level === "facile");
    expect(facile.map((q) => [q.id, q.position])).toEqual([
      ["exemple-decouverte-facile-01", 0],
      ["exemple-decouverte-facile-02", 1],
    ]);
    expect(payload.chapters[0].questions[0]).toMatchObject({
      options: [
        { id: "a", text: "Un seul" },
        { id: "b", text: "Deux" },
        { id: "c", text: "Trois" },
        { id: "d", text: "Cinq" },
      ],
      correct_option: "c",
      review_status: "a_relire",
    });
    expect(payload.chapters[0].questions[3].decor).toBeNull();
  });

  it("tire l'identifiant de la matière de son titre à défaut", () => {
    expect(slugify("Introduction historique au droit")).toBe("introduction-historique-au-droit");
    expect(slugify("  Droit constitutionnel : L1 ")).toBe("droit-constitutionnel-l1");
  });
});

// Le contenu réel n'est pas versionné : ces tests ne tournent que là où le fichier est présent.
describe.runIf(existsSync(REAL_FILE))("contenu réel (content/questions.json)", () => {
  // Lu dans beforeAll, et non à la collecte des tests : sans fichier, la suite est simplement ignorée.
  let raw: { chapitres: Record<string, unknown>[] };
  beforeAll(() => {
    raw = JSON.parse(readFileSync(REAL_FILE, "utf8"));
  });

  it("est valide et contient 108 questions sur 4 chapitres et 3 niveaux", () => {
    const result = validateSource(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = toImportPayload(result.subject);
    expect(payload.chapters).toHaveLength(4);
    expect(countQuestions(payload)).toBe(108);
    for (const chapter of payload.chapters) {
      for (const level of ["facile", "intermediaire", "confirme"]) {
        expect(chapter.questions.some((q) => q.level === level)).toBe(true);
      }
    }
  });

  it("reprend l'ordre, les options et les explications du fichier à l'identique", () => {
    const result = validateSource(raw);
    if (!result.ok) throw new Error("fichier invalide");
    const payload = toImportPayload(result.subject);
    raw.chapitres.forEach((chapter: Record<string, unknown>, ci: number) => {
      const niveaux = chapter.niveaux as Record<string, Record<string, unknown>[]>;
      for (const [level, questions] of Object.entries(niveaux)) {
        const imported = payload.chapters[ci].questions.filter((q) => q.level === level);
        expect(imported.map((q) => q.id)).toEqual(questions.map((q) => q.id));
        questions.forEach((q, i) => {
          expect(imported[i].explanation).toEqual(q.explication);
          expect(imported[i].prompt).toBe(q.enonce);
          expect(imported[i].correct_option).toBe(q.bonne_reponse);
          expect(imported[i].options.map((o) => o.text)).toEqual(
            (q.options as { texte: string }[]).map((o) => o.texte),
          );
        });
      }
    });
  });
});
