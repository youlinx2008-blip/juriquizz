import { describe, expect, it } from "vitest";
import {
  checkEnvironment,
  checkSchema,
  checkWebhook,
  latestMigration,
  WEBHOOK_EVENTS,
} from "./preflight-checks";

const PRODUCTION = {
  NEXT_PUBLIC_SUPABASE_URL: "https://projet.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
  NEXT_PUBLIC_SITE_URL: "https://juriquizz.fr",
  SUPABASE_SECRET_KEY: "sb_secret_x",
  STRIPE_SECRET_KEY: "sk_live_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
};

describe("vérification avant mise en ligne", () => {
  it("accepte une configuration de production complète", () => {
    expect(checkEnvironment(PRODUCTION).map((check) => check.level)).toEqual(Array(7).fill("ok"));
  });

  it("bloque une clé secrète exposée au navigateur ou une variable manquante", () => {
    const checks = checkEnvironment({
      ...PRODUCTION,
      STRIPE_WEBHOOK_SECRET: undefined,
      NEXT_PUBLIC_STRIPE_SECRET_KEY: "sk_live_x",
    });
    expect(checks.filter((check) => check.level === "bloquant").map((check) => check.label)).toEqual([
      "Secret du webhook Stripe",
      "Clés secrètes exposées",
    ]);
  });

  it("signale une clé Stripe de test et un site sans HTTPS", () => {
    const checks = checkEnvironment({
      ...PRODUCTION,
      STRIPE_SECRET_KEY: "sk_test_x",
      NEXT_PUBLIC_SITE_URL: "http://x",
    });
    expect(checks.filter((check) => check.level === "attention").map((check) => check.label)).toEqual([
      "Adresse du site",
      "Clé Stripe",
    ]);
  });

  it("compare la version du schéma à la dernière migration du dépôt", () => {
    const expected = latestMigration(["20261002120000_schema.sql", "20261006120000_audit.sql", "notes.txt"]);
    expect(expected).toBe("20261006120000");
    expect(checkSchema("20261006120000", expected).level).toBe("ok");
    expect(checkSchema("20261005120200", expected).level).toBe("bloquant");
    expect(checkSchema(null, expected).level).toBe("bloquant");
  });

  it("vérifie l'adresse, l'état et les événements du webhook Stripe", () => {
    const site = "https://juriquizz.fr/";
    const url = "https://juriquizz.fr/api/stripe/webhook";
    expect(checkWebhook([{ url, status: "enabled", enabled_events: WEBHOOK_EVENTS }], site).level).toBe("ok");
    expect(checkWebhook([{ url, status: "enabled", enabled_events: ["*"] }], site).level).toBe("ok");
    expect(checkWebhook([{ url, status: "disabled", enabled_events: ["*"] }], site).level).toBe("bloquant");
    expect(
      checkWebhook([{ url, status: "enabled", enabled_events: WEBHOOK_EVENTS.slice(1) }], site).detail,
    ).toBe("événements manquants : checkout.session.completed");
    expect(checkWebhook([], site).level).toBe("bloquant");
  });
});
