/**
 * Vérification avant mise en ligne : configuration, base de données, contenu, vente, Stripe et site.
 * Ne modifie rien. Les variables viennent de .env.local ou de l'environnement (celles de la
 * production, comme pour l'import du contenu).
 *
 *   npm run preflight
 *   npm run preflight -- --sans-site      (sans interroger le site en ligne)
 */
import { readdirSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import Stripe from "stripe";
import {
  checkEnvironment,
  checkSchema,
  checkWebhook,
  fail,
  latestMigration,
  ok,
  warn,
  type Check,
} from "./lib/preflight-checks";
import { createServiceClient, parseArgs } from "./lib/service-client";

const SYMBOLS = { ok: "✓", attention: "!", bloquant: "✗" } as const;

function mentions(text: string, word: string): boolean {
  return text.toLocaleLowerCase("fr-FR").includes(word.toLocaleLowerCase("fr-FR"));
}

async function databaseChecks(): Promise<Check[]> {
  const client = createServiceClient();
  const checks: Check[] = [];

  const { data: version, error: versionError } = await client.rpc("schema_version");
  checks.push(
    versionError
      ? fail(
          "Schéma de la base",
          `version illisible (${versionError.message}) : lancer \`npx supabase db push\``,
        )
      : checkSchema(version ?? null, latestMigration(readdirSync("supabase/migrations"))),
  );

  const bucket = await client.storage.getBucket("cours");
  checks.push(
    !bucket.data
      ? fail("Stockage des cours", bucket.error?.message ?? "compartiment « cours » absent")
      : bucket.data.public
        ? fail("Stockage des cours", "le compartiment « cours » est public")
        : ok("Stockage des cours", "privé"),
  );

  const admins = await client.from("admins").select("user_id", { count: "exact", head: true });
  checks.push(
    (admins.count ?? 0) > 0
      ? ok("Administration", `${admins.count} compte(s) administrateur`)
      : fail("Administration", "aucun administrateur : npm run admin:add -- <email>"),
  );
  return checks;
}

async function contentChecks(): Promise<Check[]> {
  const client = createServiceClient();
  const checks: Check[] = [];
  const { data: subjects } = await client.from("subjects").select("id, title, visible");
  const visible = (subjects ?? []).filter((subject) => subject.visible);
  if (visible.length === 0) {
    checks.push(fail("Matières", "aucune matière visible : importer avec --publier ou la rendre visible"));
    return checks;
  }
  checks.push(ok("Matières visibles", visible.map((subject) => subject.title).join(", ")));
  const { data: chapters } = await client
    .from("chapters")
    .select("id")
    .in(
      "subject_id",
      visible.map((subject) => subject.id),
    );
  const chapterIds = (chapters ?? []).map((chapter) => chapter.id);
  const count = async (status: "relue" | "a_relire" | "a_corriger", demo = false) => {
    let query = client
      .from("questions")
      .select("id", { count: "exact", head: true })
      .in("chapter_id", chapterIds)
      .eq("review_status", status)
      .is("retired_at", null);
    if (demo) query = query.eq("demo", true);
    return (await query).count ?? 0;
  };
  const [relue, toReview, toFix, demo] = await Promise.all([
    count("relue"),
    count("a_relire"),
    count("a_corriger"),
    count("relue", true),
  ]);
  const summary = `${relue} relue(s), ${toReview} à relire, ${toFix} à corriger`;
  checks.push(
    relue === 0
      ? warn("Questions", `${summary} : les acheteurs ne voient que les questions relues`)
      : ok("Questions", summary),
  );
  checks.push(
    demo > 0
      ? ok("Mini-quiz de démonstration", `${demo} question(s)`)
      : warn("Mini-quiz de démonstration", "aucune question choisie (/admin/questions, bouton « Démo »)"),
  );
  return checks;
}

async function salesChecks(): Promise<Check[]> {
  const client = createServiceClient();
  const checks: Check[] = [];
  const [{ data: legal }, { data: offers }, { data: settings }, { data: exclusives }, { count: exams }] =
    await Promise.all([
      client.from("legal_pages").select("slug, title, body"),
      client.rpc("pass_offers"),
      client.from("settings").select("beta_ends_at, referral_enabled").maybeSingle(),
      client.rpc("premium_exclusives"),
      client.from("mock_exams").select("id", { count: "exact", head: true }).eq("visible", true),
    ]);
  const pages = legal ?? [];
  const incomplete = pages.filter((page) => page.body.includes("[À COMPLÉTER"));
  checks.push(
    incomplete.length
      ? warn(
          "Textes légaux",
          `à compléter : ${incomplete.map((page) => page.title).join(", ")} (vente fermée)`,
        )
      : ok("Textes légaux", "complets"),
  );
  const onSale = (offers ?? []).filter((offer) => offer.available);
  const undated = (offers ?? []).filter((offer) => offer.ends_at === null);
  checks.push(
    onSale.length
      ? ok("Offres activées", onSale.map((offer) => `${offer.label} ${offer.price_cents / 100} €`).join(", "))
      : warn("Offres activées", "aucune"),
  );
  if (undated.length) {
    checks.push(
      warn(
        "Dates des partiels",
        `à saisir dans /admin/vente (${undated.map((offer) => offer.label).join(", ")})`,
      ),
    );
  }
  checks.push(
    settings?.beta_ends_at
      ? ok(
          "Fin de la bêta",
          new Date(settings.beta_ends_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }),
        )
      : warn("Fin de la bêta", "non fixée : les accès des testeurs n'ont pas de fin (/admin/vente)"),
  );

  // Phase 2 : ce qui est ouvert doit figurer dans les textes.
  const cgv = pages.find((page) => page.slug === "cgv")?.body ?? "";
  const privacy = pages.find((page) => page.slug === "confidentialite")?.body ?? "";
  const premium = (offers ?? []).find((offer) => offer.plan === "pass_annee_premium");
  if (premium?.available && !mentions(cgv, "premium")) {
    checks.push(
      warn("Pass Année Premium", "en vente, mais absent des CGV (clause proposée dans /admin/reglages)"),
    );
  } else if (premium && !premium.available && (exclusives ?? []).length < 2) {
    checks.push(
      ok("Pass Année Premium", `hors vente (${(exclusives ?? []).length} exclusivité(s) disponible(s))`),
    );
  }
  if (settings?.referral_enabled) {
    if (!mentions(cgv, "parrainage")) checks.push(warn("Parrainage", "ouvert, mais absent des CGV"));
    if (!mentions(privacy, "parrain"))
      checks.push(warn("Parrainage", "ouvert, mais absent de la politique de confidentialité"));
  }
  if ((exams ?? 0) > 0 && !mentions(privacy, "examen")) {
    checks.push(warn("Examens blancs", "proposés, mais absents de la politique de confidentialité"));
  }
  return checks;
}

async function stripeChecks(site: string | undefined): Promise<Check[]> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return [warn("Stripe", "pas de clé : vérifications Stripe sautées")];
  const stripe = new Stripe(key, { telemetry: false, maxNetworkRetries: 1 });
  const checks: Check[] = [];
  try {
    const account = await stripe.accounts.retrieveCurrent();
    const live = key.includes("_live_");
    checks.push(
      account.charges_enabled
        ? ok("Compte Stripe", `${account.settings?.dashboard?.display_name ?? account.id}, paiements activés`)
        : (live ? fail : warn)("Compte Stripe", "paiements pas encore activés (vérification du compte)"),
    );
    if (site) {
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
      checks.push(checkWebhook(endpoints.data, site));
    }
  } catch (error) {
    checks.push(fail("Stripe", `appel impossible : ${(error as Error).message}`));
  }
  return checks;
}

async function siteChecks(site: string): Promise<Check[]> {
  const checks: Check[] = [];
  try {
    const home = await fetch(site, { redirect: "follow" });
    checks.push(
      home.ok
        ? ok("Site en ligne", `${site} répond`)
        : fail("Site en ligne", `${site} : HTTP ${home.status}`),
    );
    checks.push(
      home.headers.get("content-security-policy")?.includes("nonce-")
        ? ok("Politique de sécurité du contenu")
        : warn("Politique de sécurité du contenu", "en-tête absent (version déployée ancienne ?)"),
    );
    if (site.startsWith("https://")) {
      checks.push(
        home.headers.get("strict-transport-security")
          ? ok("HTTPS imposé (HSTS)")
          : warn("HTTPS imposé (HSTS)", "en-tête absent"),
      );
    }
    // Une notification non signée doit être refusée (400) : le serveur a sa configuration de paiement.
    const webhook = await fetch(`${site.replace(/\/+$/, "")}/api/stripe/webhook`, {
      method: "POST",
      body: "{}",
    });
    checks.push(
      webhook.status === 400
        ? ok("Paiement configuré sur le serveur")
        : webhook.status === 503
          ? fail("Paiement configuré sur le serveur", "variables Stripe absentes du serveur (Vercel)")
          : warn("Paiement configuré sur le serveur", `réponse inattendue : HTTP ${webhook.status}`),
    );
  } catch (error) {
    checks.push(fail("Site en ligne", `${site} injoignable : ${(error as Error).message}`));
  }
  return checks;
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const sections: [string, Check[] | (() => Promise<Check[]>)][] = [
    ["Configuration", checkEnvironment(process.env)],
    ["Base de données", databaseChecks],
    ["Contenu", contentChecks],
    ["Vente", salesChecks],
    ["Stripe", () => stripeChecks(site)],
  ];
  if (site && !flags.has("sans-site")) sections.push(["Site", () => siteChecks(site)]);

  let blocking = 0;
  let warnings = 0;
  for (const [title, source] of sections) {
    let checks: Check[];
    try {
      checks = typeof source === "function" ? await source() : source;
    } catch (error) {
      checks = [fail(title, (error as Error).message)];
    }
    console.log(`\n${title}`);
    for (const check of checks) {
      console.log(`  ${SYMBOLS[check.level]} ${check.label}${check.detail ? ` : ${check.detail}` : ""}`);
      if (check.level === "bloquant") blocking += 1;
      if (check.level === "attention") warnings += 1;
    }
  }
  console.log(
    `\n${blocking ? `${blocking} point(s) bloquant(s)` : "Aucun point bloquant"}, ${warnings} point(s) d'attention.`,
  );
  process.exitCode = blocking ? 1 : 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
