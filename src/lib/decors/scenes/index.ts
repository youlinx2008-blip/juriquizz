import type { DecorKey } from "../registry";
import { codexParticles, drawCodex } from "./codex";
import { chateauParticles, drawChateau } from "./chateau";
import { drawEglise, egliseParticles } from "./eglise";
import { drawFrontiere, frontiereParticles } from "./frontiere";
import { createKit, type Kit } from "./kit";
import { drawMer } from "./mer";
import { drawPlaine, plaineParticles } from "./plaine";
import { drawRuines, ruinesParticles } from "./ruines";

type SceneDefinition = {
  /** Graine du générateur : fixe, pour un dessin identique à chaque chargement. */
  seed: number;
  draw: (kit: Kit) => string;
  particles?: (kit: Kit) => string;
};

const SCENES: Record<DecorKey, SceneDefinition> = {
  ruines: { seed: 11, draw: drawRuines, particles: ruinesParticles },
  frontiere: { seed: 549428303, draw: drawFrontiere, particles: frontiereParticles },
  codex: { seed: 1670041667, draw: drawCodex, particles: codexParticles },
  eglise: { seed: 470295357, draw: drawEglise, particles: egliseParticles },
  plaine: { seed: 1745084172, draw: drawPlaine, particles: plaineParticles },
  mer: { seed: 397829369, draw: drawMer },
  chateau: { seed: 1245731664, draw: drawChateau, particles: chateauParticles },
};

export type SceneMarkup = { svg: string; particles: string };

const cache = new Map<DecorKey, SceneMarkup>();

/** Dessin complet d'un décor (SVG et particules), calculé une fois puis mis en cache. */
export function renderScene(key: DecorKey): SceneMarkup {
  const cached = cache.get(key);
  if (cached) return cached;
  const definition = SCENES[key];
  const kit = createKit(definition.seed);
  const svg = definition.draw(kit);
  const particles = definition.particles ? definition.particles(kit) : "";
  const markup = { svg, particles };
  cache.set(key, markup);
  return markup;
}
