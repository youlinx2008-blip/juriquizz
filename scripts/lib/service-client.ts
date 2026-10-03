import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";

/**
 * Client « service » pour les scripts lancés par l'auteur sur sa machine.
 * La clé secrète contourne la RLS : elle ne doit jamais être exposée à l'application web.
 */
export function createServiceClient(): SupabaseClient<Database> {
  loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Variables manquantes : NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) et SUPABASE_SECRET_KEY " +
        "(ou SUPABASE_SERVICE_ROLE_KEY). Voir .env.example.",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Arguments de la ligne de commande : fichiers, options (--essai) et valeurs (--libelle=…). */
export function parseArgs(argv: string[]): {
  files: string[];
  flags: Set<string>;
  values: Map<string, string>;
} {
  const files: string[] = [];
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith("--")) files.push(arg);
    else if (arg.includes("=")) values.set(arg.slice(2, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1));
    else flags.add(arg.slice(2));
  }
  return { files, flags, values };
}
