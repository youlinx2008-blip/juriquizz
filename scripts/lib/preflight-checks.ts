/**
 * Logique de la vérification avant mise en ligne (sans accès réseau) : variables d'environnement,
 * version du schéma, réglages du webhook Stripe.
 */

export type Level = "ok" | "attention" | "bloquant";
export type Check = { level: Level; label: string; detail?: string };

export const ok = (label: string, detail?: string): Check => ({ level: "ok", label, detail });
export const warn = (label: string, detail?: string): Check => ({ level: "attention", label, detail });
export const fail = (label: string, detail?: string): Check => ({ level: "bloquant", label, detail });

const SECRET_NAME = /SECRET|SERVICE_ROLE|WEBHOOK|PASSWORD|PRIVATE/i;

/** Variables nécessaires au site, et aucune clé secrète exposée au navigateur. */
export function checkEnvironment(env: Record<string, string | undefined>): Check[] {
  const checks: Check[] = [];
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) checks.push(fail("Adresse Supabase", "NEXT_PUBLIC_SUPABASE_URL manquante"));
  else if (!supabaseUrl.startsWith("https://"))
    checks.push(warn("Adresse Supabase", `${supabaseUrl} (base locale ?)`));
  else checks.push(ok("Adresse Supabase", supabaseUrl));

  if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    checks.push(fail("Clé publique Supabase", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquante"));
  } else checks.push(ok("Clé publique Supabase"));

  const site = env.NEXT_PUBLIC_SITE_URL;
  if (!site)
    checks.push(
      fail("Adresse du site", "NEXT_PUBLIC_SITE_URL manquante (liens des e-mails, retour de paiement)"),
    );
  else if (!site.startsWith("https://")) checks.push(warn("Adresse du site", `${site} n'est pas en HTTPS`));
  else checks.push(ok("Adresse du site", site));

  checks.push(
    env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
      ? ok("Clé secrète Supabase")
      : fail("Clé secrète Supabase", "SUPABASE_SECRET_KEY manquante (paiements, cours en PDF)"),
  );

  const stripeKey = env.STRIPE_SECRET_KEY ?? "";
  if (!stripeKey) checks.push(fail("Clé Stripe", "STRIPE_SECRET_KEY manquante : la vente reste fermée"));
  else if (stripeKey.startsWith("sk_live_") || stripeKey.startsWith("rk_live_"))
    checks.push(ok("Clé Stripe", "mode réel"));
  else checks.push(warn("Clé Stripe", "clé de test : aucun paiement réel ne sera encaissé"));

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET ?? "";
  checks.push(
    webhookSecret.startsWith("whsec_")
      ? ok("Secret du webhook Stripe")
      : fail("Secret du webhook Stripe", "STRIPE_WEBHOOK_SECRET manquant ou mal formé (whsec_…)"),
  );

  const exposed = Object.keys(env).filter(
    (name) => name.startsWith("NEXT_PUBLIC_") && SECRET_NAME.test(name),
  );
  checks.push(
    exposed.length
      ? fail(
          "Clés secrètes exposées",
          `${exposed.join(", ")} : le préfixe NEXT_PUBLIC_ les envoie au navigateur`,
        )
      : ok("Aucune clé secrète exposée au navigateur"),
  );
  return checks;
}

/** Dernière migration du dépôt (nom de fichier « 20261006120000_… .sql »). */
export function latestMigration(files: string[]): string | null {
  const versions = files
    .map((file) => /^(\d{14})_.+\.sql$/.exec(file)?.[1])
    .filter((version): version is string => Boolean(version))
    .sort();
  return versions.at(-1) ?? null;
}

export function checkSchema(applied: string | null, expected: string | null): Check {
  if (!expected) return warn("Schéma de la base", "aucune migration trouvée dans supabase/migrations");
  if (!applied) return fail("Schéma de la base", "version inconnue : lancer `npx supabase db push`");
  if (applied < expected)
    return fail(
      "Schéma de la base",
      `en retard (${applied} < ${expected}) : lancer \`npx supabase db push\``,
    );
  if (applied > expected)
    return warn("Schéma de la base", `plus récent que ce dépôt (${applied}) : dépôt à jour ?`);
  return ok("Schéma de la base", `à jour (${applied})`);
}

export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "charge.refunded",
];

/** Point de terminaison du webhook : bonne adresse, actif, avec les quatre événements. */
export function checkWebhook(
  endpoints: { url: string; status: string; enabled_events: string[] }[],
  site: string,
): Check {
  const url = `${site.replace(/\/+$/, "")}/api/stripe/webhook`;
  const endpoint = endpoints.find((item) => item.url === url);
  if (!endpoint) return fail("Webhook Stripe", `aucun point de terminaison ${url}`);
  if (endpoint.status !== "enabled") return fail("Webhook Stripe", `${url} est désactivé`);
  const missing = endpoint.enabled_events.includes("*")
    ? []
    : WEBHOOK_EVENTS.filter((event) => !endpoint.enabled_events.includes(event));
  return missing.length
    ? fail("Webhook Stripe", `événements manquants : ${missing.join(", ")}`)
    : ok("Webhook Stripe", url);
}
