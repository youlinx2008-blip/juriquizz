/**
 * Préférences d'affichage et de son. Elles sont gardées dans le navigateur (pour s'appliquer
 * avant même l'affichage) et, pour un compte, dans son profil (pour le suivre d'un appareil à l'autre).
 */

export type DecorMode = "anime" | "fixe" | "off";
export type ThemePref = "auto" | "clair" | "sombre";

export type Prefs = {
  sound: "on" | "off";
  volume: number;
  decor: DecorMode;
  theme: ThemePref;
};

export const PREFS_STORAGE_KEY = "jq-prefs";
export const DEFAULT_VOLUME = 0.35;

export const DECOR_MODE_LABELS: Record<DecorMode, string> = {
  anime: "Décor animé",
  fixe: "Décor fixe",
  off: "Sans décor",
};

export const THEME_LABELS: Record<ThemePref, string> = {
  auto: "Comme l'appareil",
  clair: "Clair",
  sombre: "Sombre",
};

export function defaultPrefs(reducedMotion: boolean): Prefs {
  return { sound: "on", volume: DEFAULT_VOLUME, decor: reducedMotion ? "fixe" : "anime", theme: "auto" };
}

function isDecorMode(value: unknown): value is DecorMode {
  return value === "anime" || value === "fixe" || value === "off";
}

function isThemePref(value: unknown): value is ThemePref {
  return value === "auto" || value === "clair" || value === "sombre";
}

function isVolume(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Complète des préférences partielles ou abîmées avec les valeurs par défaut. */
export function sanitizePrefs(input: unknown, reducedMotion: boolean): Prefs {
  const base = defaultPrefs(reducedMotion);
  if (!input || typeof input !== "object") return base;
  const raw = input as Record<string, unknown>;
  return {
    sound: raw.sound === "off" ? "off" : raw.sound === "on" ? "on" : base.sound,
    volume: isVolume(raw.volume) ? raw.volume : base.volume,
    decor: isDecorMode(raw.decor) ? raw.decor : base.decor,
    theme: isThemePref(raw.theme) ? raw.theme : base.theme,
  };
}

export type ProfilePrefs = {
  sound_pref: string | null;
  decor_pref: string | null;
  theme_pref: string | null;
  volume: number | null;
};

/** Préférences enregistrées dans le profil (seules celles déjà choisies). */
export function prefsFromProfile(profile: ProfilePrefs): Partial<Prefs> {
  const result: Partial<Prefs> = {};
  if (profile.sound_pref === "on" || profile.sound_pref === "off") result.sound = profile.sound_pref;
  if (isVolume(profile.volume)) result.volume = profile.volume;
  if (isDecorMode(profile.decor_pref)) result.decor = profile.decor_pref;
  if (isThemePref(profile.theme_pref)) result.theme = profile.theme_pref;
  return result;
}

export function prefsToProfile(prefs: Prefs): ProfilePrefs {
  return {
    sound_pref: prefs.sound,
    decor_pref: prefs.decor,
    theme_pref: prefs.theme,
    volume: Math.round(prefs.volume * 100) / 100,
  };
}

/** Valeur de l'attribut data-theme : absent en automatique (le système décide). */
export function themeAttribute(theme: ThemePref): "light" | "dark" | null {
  return theme === "clair" ? "light" : theme === "sombre" ? "dark" : null;
}

/**
 * Script exécuté avant le premier affichage : applique le thème et le mode de décor
 * enregistrés, pour éviter un éclair de la mauvaise apparence.
 */
export const PREFS_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,p={};try{p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PREFS_STORAGE_KEY,
)})||"{}")||{}}catch(e){}var rm=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;d.setAttribute("data-decor",p.decor==="anime"||p.decor==="fixe"||p.decor==="off"?p.decor:(rm?"fixe":"anime"));if(p.theme==="clair")d.setAttribute("data-theme","light");else if(p.theme==="sombre")d.setAttribute("data-theme","dark")}catch(e){}})();`;
