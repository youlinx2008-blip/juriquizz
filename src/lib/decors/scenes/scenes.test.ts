import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DECOR_KEYS, DECORS } from "../registry";
import { renderScene } from "./index";

/*
 * Empreintes des dessins : elles correspondent au rendu du prototype de référence.
 * Si un décor est modifié volontairement, mettre à jour l'empreinte ici.
 */
const FINGERPRINTS: Record<string, string> = {
  ruines: "ec27c299fe7177c1",
  frontiere: "9437d6ba58bbddad",
  codex: "f4fc309377a17620",
  eglise: "bae569b1ef7c2bbd",
  plaine: "bc7124c5db7b38b8",
  mer: "e3b787e11520c95c",
  chateau: "913bbbce51e2fb90",
};

function fingerprint(key: (typeof DECOR_KEYS)[number]): string {
  const { svg, particles } = renderScene(key);
  return createHash("sha256")
    .update(svg + particles)
    .digest("hex")
    .slice(0, 16);
}

describe("décors", () => {
  it.each(DECOR_KEYS)("%s : dessin SVG complet et stable", (key) => {
    const { svg } = renderScene(key);
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(fingerprint(key)).toBe(FINGERPRINTS[key]);
  });

  it("n'utilise jamais deux fois le même identifiant interne, même entre décors", () => {
    // Deux décors sont affichés ensemble pendant le fondu : leurs dégradés ne doivent pas se mélanger.
    const ids = DECOR_KEYS.flatMap((key) =>
      [...renderScene(key).svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a une fiche (libellé, accents, emblème) pour chaque décor", () => {
    for (const key of DECOR_KEYS) {
      expect(DECORS[key].label).not.toBe("");
      expect(DECORS[key].accentLight).toMatch(/^#[0-9a-f]{6}$/);
      expect(DECORS[key].accentDark).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
