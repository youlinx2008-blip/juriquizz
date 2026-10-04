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
  /** Accès au contenu (pass, testeur bêta ou administration). */
  hasAccess: boolean;
  hasBeta: boolean;
  /** Fin de l'accès en cours (null : pas d'accès, ou accès sans date de fin). */
  accessEndsAt: string | null;
  /** Fin du dernier accès terminé (pass expiré). */
  lastEndedAt: string | null;
  /** Version des CGU en vigueur et version acceptée par l'utilisateur. */
  cguVersion: number | null;
  termsVersion: number | null;
  /** Nom et prénom pour le filigrane des cours en PDF. */
  fullName: string | null;
  profilePrefs: Partial<Prefs>;
};

type ViewerContext = {
  is_admin: boolean;
  has_access: boolean;
  has_beta: boolean;
  access_ends_at: string | null;
  last_ended_at: string | null;
  cgu_version: number | null;
  profile: {
    display_name: string;
    sound_pref: string | null;
    decor_pref: string | null;
    theme_pref: string | null;
    volume: number | null;
    terms_version: number | null;
    full_name: string | null;
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
    accessEndsAt: ctx.has_access ? (ctx.access_ends_at ?? null) : null,
    lastEndedAt: ctx.last_ended_at ?? null,
    cguVersion: ctx.cgu_version ?? null,
    termsVersion: ctx.profile?.terms_version ?? null,
    fullName: ctx.profile?.full_name ?? null,
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

/** Page réservée aux comptes qui ont un accès en cours (pass, bêta) ; sinon, page « Mon accès ». */
export async function requireAccess(next: string): Promise<Viewer> {
  const viewer = await requireViewer(next);
  if (!viewer.hasAccess) redirect(`/acces?suite=${encodeURIComponent(next)}`);
  return viewer;
}

/** Page d'administration : introuvable pour les autres. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!viewer.isAdmin) notFound();
  return viewer;
}
