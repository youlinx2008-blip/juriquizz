/*
 * Deux appareils connectés au plus par compte (hors administration). Chaque navigateur porte un
 * identifiant aléatoire (cookie « appareil ») dès les pages de connexion ; à la connexion, le navigateur
 * est inscrit sur le compte, puis le proxy vérifie de temps en temps qu'il n'a pas été déconnecté.
 * Au-delà de deux appareils, le plus ancien est déconnecté à sa vérification suivante.
 */

export const DEVICE_COOKIE = "jq_appareil";
/** Dernière vérification : « identifiant du compte.instant », pour ne pas interroger la base à chaque page. */
export const DEVICE_CHECK_COOKIE = "jq_appareil_vu";
export const DEVICE_CHECK_EVERY_MS = 5 * 60 * 1000;

/** Pages qui précèdent une connexion : le navigateur y reçoit son identifiant. */
export function isAuthPath(pathname: string): boolean {
  return /^\/(connexion|inscription|auth)(\/|$)/.test(pathname);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDeviceId(value: string | undefined): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * Que faire pour ce navigateur : rien (vérifié récemment), « verifier » (vérifié il y a plus de cinq
 * minutes) ou « inscrire » (connexion nouvelle sur ce navigateur, ou autre compte).
 */
export function deviceStep(
  lastCheck: string | undefined,
  userId: string,
  now: number,
): "rien" | "verifier" | "inscrire" {
  const [user, at] = (lastCheck ?? "").split(".");
  if (user !== userId) return "inscrire";
  return now - Number(at) < DEVICE_CHECK_EVERY_MS ? "rien" : "verifier";
}

/** « Chrome sur Android », d'après l'en-tête User-Agent : pour reconnaître ses appareils dans « Compte ». */
export function describeDevice(userAgent: string | null): string {
  const ua = userAgent ?? "";
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome\/|CriOS/.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Navigateur";
  const system = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /CrOS/.test(ua)
          ? "Chromebook"
          : /Macintosh|Mac OS X/.test(ua)
            ? "Mac"
            : /Windows/.test(ua)
              ? "Windows"
              : /Linux/.test(ua)
                ? "Linux"
                : "appareil inconnu";
  return `${browser} sur ${system}`;
}

export const DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
};
