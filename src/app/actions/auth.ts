"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth";
import { DEVICE_CHECK_COOKIE, DEVICE_COOKIE, isDeviceId } from "@/lib/devices";
import { authErrorMessage, BETA_CODE_MESSAGES } from "@/lib/auth-messages";
import { siteUrl } from "@/lib/supabase/env";
import { createClient, type ServerClient } from "@/lib/supabase/server";

export type AuthFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: Record<string, string> }
  | { status: "check-email"; email: string; next: string };

const email = z.string().trim().toLowerCase().email("Adresse e-mail invalide.");
const password = z
  .string()
  .min(8, "Mot de passe : 8 caractères au moins.")
  .max(72, "Mot de passe trop long.");

function confirmUrl(next: string): string {
  return `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

const signUpSchema = z
  .object({
    displayName: z.string().trim().max(60, "Pseudo : 60 caractères au plus.").default(""),
    email,
    betaCode: z.string().trim().max(40, "Code invalide.").default(""),
    method: z.enum(["password", "link"]),
    password: z.string().default(""),
    acceptTerms: z.literal("on", { error: "Accepte les conditions d’utilisation pour créer ton compte." }),
  })
  .superRefine((value, ctx) => {
    if (value.method === "password") {
      const check = password.safeParse(value.password);
      if (!check.success)
        ctx.addIssue({ code: "custom", path: ["password"], message: check.error.issues[0].message });
    }
  });

function firstIssues(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Création de compte. Sans code : compte gratuit (démonstration, aperçus, achat d'un pass). Avec un code
 * d'invitation : il est vérifié d'abord, puis appliqué à la création du compte (accès bêta).
 */
export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    email: formData.get("email"),
    betaCode: formData.get("betaCode") ?? "",
    method: formData.get("method"),
    password: formData.get("password") ?? "",
    acceptTerms: formData.get("acceptTerms"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Vérifie les champs indiqués.", fields: firstIssues(parsed.error) };
  }
  const input = parsed.data;
  const supabase = await createClient();

  if (input.betaCode) {
    const { data: codeStatus, error: codeError } = await supabase.rpc("check_beta_code", {
      p_code: input.betaCode,
    });
    if (codeError) return { status: "error", message: authErrorMessage(null) };
    if (codeStatus !== "ok") {
      return {
        status: "error",
        message: "Code d’invitation refusé.",
        fields: { betaCode: BETA_CODE_MESSAGES[codeStatus] ?? BETA_CODE_MESSAGES.invalide },
      };
    }
  }

  // Version des CGU acceptées, retenue sur le profil.
  const { data: cgu } = await supabase.from("legal_pages").select("version").eq("slug", "cgu").maybeSingle();
  const metadata = {
    display_name: input.displayName,
    ...(input.betaCode ? { beta_code: input.betaCode } : {}),
    ...(cgu ? { terms_version: String(cgu.version) } : {}),
  };
  const next = safeNext(formData.get("next"), input.betaCode ? "/cours" : "/acces");

  if (input.method === "password") {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: metadata, emailRedirectTo: confirmUrl(next) },
    });
    if (error) return { status: "error", message: authErrorMessage(error) };
    if (data.session) redirect(next);
    // Confirmation de l'adresse demandée (ou compte déjà existant : même message, par discrétion).
    return { status: "check-email", email: input.email, next };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: { shouldCreateUser: true, data: metadata, emailRedirectTo: confirmUrl(next) },
  });
  if (error) return { status: "error", message: authErrorMessage(error) };
  return { status: "check-email", email: input.email, next };
}

const passwordLoginSchema = z.object({ email, password: z.string().min(1, "Mot de passe requis.") });

export async function passwordLoginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = passwordLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Vérifie les champs indiqués.", fields: firstIssues(parsed.error) };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authErrorMessage(error) };
  redirect(safeNext(formData.get("next")));
}

/** Lien (et code à 6 chiffres) envoyé par e-mail, pour les comptes existants. */
export async function emailLinkAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success)
    return {
      status: "error",
      message: "Adresse e-mail invalide.",
      fields: { email: "Adresse e-mail invalide." },
    };
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: false, emailRedirectTo: confirmUrl(next) },
  });
  // Même réponse que le compte existe ou non : on ne révèle pas qui est inscrit.
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { status: "error", message: authErrorMessage(error) };
  }
  return { status: "check-email", email: parsed.data, next };
}

const otpSchema = z.object({
  email,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Le code contient 6 chiffres."),
});

/** Saisie du code reçu par e-mail (utile quand le lien s'ouvre dans un autre navigateur). */
export async function verifyEmailCodeAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = otpSchema.safeParse({ email: formData.get("email"), token: formData.get("token") });
  const next = safeNext(formData.get("next"));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Code invalide.",
      fields: firstIssues(parsed.error),
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });
  if (error)
    return { status: "error", message: authErrorMessage(error.code ? error : { code: "otp_expired" }) };
  redirect(next);
}

export type RedeemState = { status: "idle" } | { status: "error"; message: string };

export async function redeemCodeAction(_prev: RedeemState, formData: FormData): Promise<RedeemState> {
  const code = String(formData.get("betaCode") ?? "").trim();
  if (!code) return { status: "error", message: "Saisis ton code bêta." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_beta_code", { p_code: code });
  if (error) return { status: "error", message: "Connecte-toi d'abord, puis saisis ton code." };
  if (data !== "ok" && data !== "deja_actif") {
    return { status: "error", message: BETA_CODE_MESSAGES[data] ?? BETA_CODE_MESSAGES.invalide };
  }
  redirect(safeNext(formData.get("next")));
}

/** Déconnexion : l'appareil libère sa place (deux appareils au plus par compte). */
async function forgetDevice(supabase: ServerClient): Promise<void> {
  const store = await cookies();
  const key = store.get(DEVICE_COOKIE)?.value;
  if (isDeviceId(key)) {
    const { data } = await supabase.from("device_sessions").select("id").eq("browser_key", key).maybeSingle();
    if (data) await supabase.rpc("revoke_device", { p_device: data.id });
  }
  store.delete(DEVICE_CHECK_COOKIE);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await forgetDevice(supabase);
  await supabase.auth.signOut();
  redirect("/");
}

/** Acceptation de la nouvelle version des CGU (bandeau affiché après une mise à jour). */
export async function acceptTermsAction(formData: FormData): Promise<void> {
  const version = Number(formData.get("version"));
  if (!Number.isInteger(version) || version < 1) return;
  const supabase = await createClient();
  await supabase.rpc("accept_terms", { p_version: version });
  revalidatePath("/", "layout");
}
