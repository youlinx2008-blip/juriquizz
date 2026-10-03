"use server";

import { prefsToProfile, sanitizePrefs, type Prefs } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/server";

/** Enregistre les réglages de son et de décor dans le profil de l'utilisateur connecté. */
export async function savePrefsAction(prefs: Prefs): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false };
  const { error } = await supabase
    .from("profiles")
    .update(prefsToProfile(sanitizePrefs(prefs, false)))
    .eq("id", userId);
  return { ok: !error };
}
