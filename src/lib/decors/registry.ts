export const DECOR_KEYS = ["ruines", "frontiere", "codex", "eglise", "plaine", "mer", "chateau"] as const;

export type DecorKey = (typeof DECOR_KEYS)[number];

export type DecorInfo = {
  key: DecorKey;
  label: string;
  /** Couleur d'accent de l'interface en mode clair. */
  accentLight: string;
  /** Couleur d'accent de l'interface en mode sombre. */
  accentDark: string;
  /** Tracés de l'emblème (icône 24 × 24, trait). */
  emblem: string;
};

export const DECORS: Record<DecorKey, DecorInfo> = {
  ruines: {
    key: "ruines",
    label: "ruines romaines",
    accentLight: "#8f3d1c",
    accentDark: "#f2a97c",
    emblem: "M4 21h16M6 18h12M7 18V9M12 18V9M17 18V9M4 9h16l-8-5z",
  },
  frontiere: {
    key: "frontiere",
    label: "frontière gelée du Rhin",
    accentLight: "#1f4e79",
    accentDark: "#95c8f2",
    emblem: "M12 2v20M4.9 6.5l14.2 11M4.9 17.5l14.2-11M9 3.8l3 2.2 3-2.2M9 20.2l3-2.2 3 2.2",
  },
  codex: {
    key: "codex",
    label: "scriptorium et codex",
    accentLight: "#6b3f12",
    accentDark: "#ebc47e",
    emblem: "M20 4c-6 1-11 6-13 13l-2 3M20 4c-1 6-6 11-13 13M9 15l-2-2",
  },
  eglise: {
    key: "eglise",
    label: "basilique et vitrail",
    accentLight: "#5a2a82",
    accentDark: "#cfb4f2",
    emblem: "M7 21V10a5 5 0 0 1 10 0v11zM12 6v15M7 14h10",
  },
  plaine: {
    key: "plaine",
    label: "champ de mai et plaine carolingienne",
    accentLight: "#2d6a2d",
    accentDark: "#a4da92",
    emblem: "M5 21V3M5 4h13l-3 4 3 4H5",
  },
  mer: {
    key: "mer",
    label: "raids vikings, mer du Nord",
    accentLight: "#0f5a6b",
    accentDark: "#86d6e3",
    emblem: "M3 15c3 3 15 3 18 0M4 15l-1-4M20 15l1-4M12 4v10M8 6h8l-1 6H9z",
  },
  chateau: {
    key: "chateau",
    label: "château fort et seigneurie",
    accentLight: "#8a2f2f",
    accentDark: "#f2a3a3",
    emblem: "M4 21V9h3v2h2V9h2v2h2V9h2v2h2V9h3v12zM10 21v-4a2 2 0 0 1 4 0v4",
  },
};

/** Décor des pages qui ne sont pas liées à un chapitre. */
export const HOME_DECOR: DecorKey = "ruines";

export function isDecorKey(value: unknown): value is DecorKey {
  return typeof value === "string" && (DECOR_KEYS as readonly string[]).includes(value);
}
