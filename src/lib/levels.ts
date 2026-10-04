export const LEVEL_IDS = ["facile", "intermediaire", "confirme"] as const;

export type LevelId = (typeof LEVEL_IDS)[number];

export type LevelInfo = {
  id: LevelId;
  label: string;
  objective: string;
};

export const LEVELS: readonly LevelInfo[] = [
  { id: "facile", label: "Facile", objective: "Mémoriser : vocabulaire, dates, définitions" },
  { id: "intermediaire", label: "Intermédiaire", objective: "Comprendre : mécanismes, causes, distinctions" },
  { id: "confirme", label: "Confirmé", objective: "Appliquer : cas pratiques, pièges" },
];

export function isLevelId(value: string): value is LevelId {
  return (LEVEL_IDS as readonly string[]).includes(value);
}

export function levelInfo(id: LevelId): LevelInfo {
  const info = LEVELS.find((level) => level.id === id);
  if (!info) throw new Error(`Niveau inconnu : ${id}`);
  return info;
}

export function previousLevel(id: LevelId): LevelId | null {
  return LEVEL_IDS[LEVEL_IDS.indexOf(id) - 1] ?? null;
}

export function nextLevel(id: LevelId): LevelId | null {
  return LEVEL_IDS[LEVEL_IDS.indexOf(id) + 1] ?? null;
}
