import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { prefsFromProfile, type Prefs } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  userId: string;
  email: string | null;
  displayName: string;
  isAdmin: boolean;
  /** Accès au contenu (testeur bêta ou administration). */
  hasAccess: boolean;
  hasBeta: boolean;
  profilePrefs: Partial<Prefs>;
};

type ViewerContext = {
  is_admin: boolean;
  has_access: boolean;
  has_beta: boolean;
  profile: {
    display_name: string;
    sound_pref: string | null;
    decor_pref: string | null;
    theme_pref: string | null;
    volume: number | null;
  } | null;
};

/** Utilisateur connecté et ses droits (une seule fois par requête). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: context, error } = await supabase.rpc("viewer_context");
  if (error) throw new Error(`Lecture du compte impossible : ${error.message}`);
  if (!context) return null;
  const ctx = context as unknown as ViewerContext;
  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    displayName: ctx.profile?.display_name ?? "",
    isAdmin: ctx.is_admin,
    hasAccess: ctx.has_access,
    hasBeta: ctx.has_beta,
    profilePrefs: ctx.profile ? prefsFromProfile(ctx.profile) : {},
  };
});

/** Chemin de retour après connexion : uniquement une page du site. */
export function safeNext(next: unknown, fallback = "/cours"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

export async function requireViewer(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/connexion?suite=${encodeURIComponent(next)}`);
  return viewer;
}

/** Page réservée aux comptes qui ont un accès valide ; sinon, page d'activation. */
export async function requireAccess(next: string): Promise<Viewer> {
  const viewer = await requireViewer(next);
  if (!viewer.hasAccess) redirect(`/activer?suite=${encodeURIComponent(next)}`);
  return viewer;
}

/** Page d'administration : introuvable pour les autres. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!viewer.isAdmin) notFound();
  return viewer;
}
