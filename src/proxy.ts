import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DEVICE_CHECK_COOKIE,
  DEVICE_COOKIE,
  DEVICE_COOKIE_OPTIONS,
  describeDevice,
  deviceStep,
  isAuthPath,
  isDeviceId,
} from "@/lib/devices";
import { contentSecurityPolicy, createNonce } from "@/lib/csp";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * À chaque requête de page : politique de sécurité du contenu (nonce propre à la requête),
 * rafraîchissement de la session Supabase (jetons dans les cookies) et vérification, de temps en
 * temps, que l'appareil fait partie des deux appareils autorisés du compte.
 * Les contrôles d'accès au contenu sont faits dans les pages et par la RLS.
 */
export async function proxy(request: NextRequest) {
  const { url, key } = supabaseEnv();
  const secure = request.nextUrl.protocol === "https:";
  const nonce = createNonce();
  const policy = contentSecurityPolicy({
    nonce,
    supabaseUrl: url,
    secure,
    dev: process.env.NODE_ENV === "development",
  });
  // Next.js lit le nonce dans la politique transmise avec la requête et l'applique à ses scripts ;
  // les cookies de session éventuellement renouvelés font partie des en-têtes recopiés.
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", policy);
    const next = NextResponse.next({ request: { headers } });
    next.headers.set("content-security-policy", policy);
    return next;
  };
  let response = forward();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = forward();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([header, value]) => response.headers.set(header, value));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  // Identifiant du navigateur, posé avant la connexion (pour qu'un même navigateur reste un appareil).
  let browserKey = request.cookies.get(DEVICE_COOKIE)?.value;
  const missingKey = !isDeviceId(browserKey);
  if (missingKey && (userId || isAuthPath(request.nextUrl.pathname))) browserKey = crypto.randomUUID();
  const keepKey = (target: NextResponse) => {
    if (missingKey && isDeviceId(browserKey)) {
      target.cookies.set(DEVICE_COOKIE, browserKey, { ...DEVICE_COOKIE_OPTIONS, secure });
    }
    return target;
  };
  if (!userId || !isDeviceId(browserKey) || isPrefetch(request)) return keepKey(response);

  const now = Date.now();
  const step = deviceStep(request.cookies.get(DEVICE_CHECK_COOKIE)?.value, userId, now);
  if (step === "rien") return keepKey(response);

  let status = step === "verifier" ? await checkDevice(supabase, browserKey) : "inconnu";
  if (status === "erreur") return keepKey(response); // Base injoignable : on réessaiera à la page suivante.
  if (status === "revoque") {
    // Compte ouvert depuis sur deux autres appareils : celui-ci est déconnecté.
    await supabase.auth.signOut({ scope: "local" });
    // Pages (chargement ou navigation dans le site) : vers la connexion, avec l'explication. L'en-tête
    // Sec-Fetch-Dest ne suffit pas : le service worker relaie les chargements de page.
    if (request.method === "GET" && !request.nextUrl.pathname.startsWith("/api/")) {
      const target = request.nextUrl.clone();
      target.pathname = "/connexion";
      target.search = "?erreur=appareils";
      const redirect = NextResponse.redirect(target);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      response = redirect;
    }
    // Les autres requêtes (actions, fichiers) continuent, sans session.
    response.cookies.delete(DEVICE_CHECK_COOKIE);
    return keepKey(response);
  }
  if (status === "inconnu") {
    const { error } = await supabase.rpc("register_device", {
      p_key: browserKey,
      p_label: describeDevice(request.headers.get("user-agent")),
    });
    status = error ? "erreur" : "actif";
  }
  if (status === "actif") {
    response.cookies.set(DEVICE_CHECK_COOKIE, `${userId}.${now}`, { ...DEVICE_COOKIE_OPTIONS, secure });
  }
  return keepKey(response);
}

async function checkDevice(supabase: ReturnType<typeof createServerClient>, key: string): Promise<string> {
  const { data, error } = await supabase.rpc("check_device", { p_key: key });
  return error || typeof data !== "string" ? "erreur" : data;
}

/** Préchargements de liens : pas de vérification d'appareil (ni d'inscription en double). */
function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.has("next-router-prefetch") ||
    /prefetch/i.test(request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "")
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/stripe/|favicon.ico|icon.svg|apple-icon.png|icons/|sw.js|hors-ligne.html|manifest.webmanifest|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
