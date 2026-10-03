"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authErrorMessage } from "@/lib/auth-messages";
import { createClient } from "@/lib/supabase/server";

export type AccountFormState =
  { status: "idle" } | { status: "ok"; message: string } | { status: "error"; message: string };

export async function updateDisplayNameAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = z
    .string()
    .trim()
    .max(60)
    .safeParse(formData.get("displayName") ?? "");
  if (!parsed.success) return { status: "error", message: "Pseudo : 60 caractères au plus." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { status: "error", message: "Connecte-toi d'abord." };
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data }).eq("id", userId);
  if (error) return { status: "error", message: "Enregistrement impossible. Réessaie." };
  return { status: "ok", message: "Pseudo enregistré." };
}

export async function updatePasswordAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { status: "error", message: "Mot de passe : 8 caractères au moins." };
  if (password !== confirm)
    return { status: "error", message: "Les deux mots de passe ne sont pas identiques." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password")
      return { status: "error", message: "C'est déjà ton mot de passe actuel." };
    if (error.code === "reauthentication_needed") {
      return { status: "error", message: "Par sécurité, reconnecte-toi puis recommence." };
    }
    return { status: "error", message: authErrorMessage(error) };
  }
  return { status: "ok", message: "Mot de passe enregistré." };
}

export async function deleteAccountAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  if (
    String(formData.get("confirm") ?? "")
      .trim()
      .toUpperCase() !== "SUPPRIMER"
  ) {
    return { status: "error", message: "Écris SUPPRIMER pour confirmer." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { status: "error", message: "Suppression impossible pour le moment. Réessaie." };
  // Le compte n'existe plus : on efface seulement la session de ce navigateur.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/?compte=supprime");
}
