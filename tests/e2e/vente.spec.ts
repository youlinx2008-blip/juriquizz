import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createServiceClient } from "../../scripts/lib/service-client";
import { buy, PASSWORD, run, signUp, startPayment, uniqueEmail } from "./support";

/*
 * Vente (phase 1), avec le faux Stripe lancé par la configuration des tests.
 * Critères : un achat de test ouvre l'accès pour la bonne durée ; un pass expiré ferme l'accès ;
 * le PDF affiché porte le filigrane de l'acheteur.
 */

const STRIPE = `http://127.0.0.1:${process.env.E2E_STRIPE_PORT ?? 12111}`;
const service = createServiceClient();
const DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

/** Date de fin annoncée pour un achat fait maintenant, telle que la page doit l'afficher. */
async function announcedEnd(plan: string): Promise<string> {
  const { data, error } = await service.rpc("pass_offers");
  if (error) throw new Error(error.message);
  const offer = data.find((item) => item.plan === plan);
  if (!offer?.ends_at) throw new Error(`Offre ${plan} sans date de fin`);
  return DAY.format(new Date(offer.ends_at));
}

async function buyerOf(paymentId: string): Promise<string> {
  const { data, error } = await service.from("payments").select("user_id").eq("id", paymentId).single();
  if (error || !data.user_id) throw new Error(error?.message ?? "Achat sans compte");
  return data.user_id;
}

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.help}`),
    label,
  ).toEqual([]);
}

test.describe("vente des pass", () => {
  test("un achat Stripe de test ouvre l'accès pour la bonne durée", async ({ page }) => {
    await signUp(page, uniqueEmail("achat"), "");
    await page.goto("/tarifs");
    const card = page.locator(".row.offer").filter({ hasText: "Pass Partiels" });
    await expect(card).toContainText(`Fin de l’accès : ${await announcedEnd("pass_partiels")}`);
    await card.getByRole("link", { name: "Choisir le Pass Partiels" }).click();
    await expect(page).toHaveURL(/\/tarifs\/partiels$/);
    await expect(page.locator(".order-summary")).toContainText(
      `${await announcedEnd("pass_partiels")} inclus`,
    );

    // Sans les deux confirmations, le paiement ne démarre pas.
    await page.getByRole("button", { name: /^Payer/ }).click();
    await expect(page.getByText("Deux confirmations sont nécessaires avant le paiement.")).toBeVisible();

    await buy(page, "partiels");
    await expect(page.getByRole("heading", { name: "Merci, ton accès est ouvert" })).toBeVisible();
    await expect(page.locator(".lead")).toContainText(
      `jusqu’au ${await announcedEnd("pass_partiels")} inclus`,
    );
    await page.getByRole("link", { name: "Commencer à réviser" }).click();
    await expect(page).toHaveURL(/\/cours$/);
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link")).toHaveText(["Cours", "Examens", "Progression", "Compte"]);
    await page.goto("/compte#achats");
    await expect(page.locator("#achats")).toContainText("Pass Partiels");
  });

  test("le Pass Mensuel dure 30 jours ; un pass expiré ferme l'accès", async ({ page }) => {
    await signUp(page, uniqueEmail("expire"), "");
    const paymentId = await buy(page, "mensuel");
    await expect(page.locator(".lead")).toContainText(
      `jusqu’au ${await announcedEnd("pass_mensuel")} inclus`,
    );
    await page.goto("/cours");
    await expect(page).toHaveURL(/\/cours$/);

    // Trente et un jours plus tard (on recule les dates de l'accès).
    const userId = await buyerOf(paymentId);
    const update = await service
      .from("entitlements")
      .update({
        starts_at: new Date(Date.now() - 31 * 86_400_000).toISOString(),
        ends_at: new Date(Date.now() - 86_400_000).toISOString(),
      })
      .eq("user_id", userId);
    expect(update.error).toBeNull();
    await page.goto("/cours");
    await expect(page).toHaveURL(/\/acces\?suite=%2Fcours$/);
    await expect(page.getByRole("heading", { name: "Ton accès a pris fin" })).toBeVisible();
    await page.goto(`/cours/${run().salesContent.subject.slug}/${run().courseChapterSlug}/lecture`);
    await expect(page).toHaveURL(/\/acces\?suite=/);
  });

  test("le cours en PDF affiché porte le filigrane de l'acheteur", async ({ page }) => {
    const email = uniqueEmail("filigrane");
    await signUp(page, email, "");
    await buy(page, "partiels");
    const { salesContent, courseChapterSlug } = run();
    await page.goto(`/cours/${salesContent.subject.slug}/${courseChapterSlug}`);
    await page.getByRole("link", { name: /^Lire le cours/ }).click();
    // Le nom imprimé avec l'adresse e-mail est demandé avant la première lecture.
    await page.getByLabel("Prénom et nom").fill("Élodie Dupré");
    await page.getByRole("button", { name: "Enregistrer et ouvrir le cours" }).click();
    const pages = page.locator(".pdf-page");
    await expect(pages).toHaveCount(3, { timeout: 30_000 });
    const first = pages.first();
    await expect(first).toHaveAttribute("data-rendered", "true", { timeout: 30_000 });
    await expect(first.locator(".textLayer")).toContainText(`Élodie Dupré - ${email}`);
    await expect(first.locator(".textLayer")).toContainText("Reproduction et diffusion interdites");
    await expect(first.locator(".textLayer")).toContainText("Sommaire du cours d'exemple");

    // Le fichier ne s'ouvre pas en dehors du lecteur (pas de visionneuse du navigateur).
    const { data: document } = await service
      .from("course_documents")
      .select("id")
      .eq("title", "Cours d'exemple")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .single();
    const direct = await page.goto(`/api/cours/${document!.id}`);
    expect(direct?.status()).toBe(403);
  });

  test("les visiteurs voient les tarifs et l'aperçu gratuit d'un cours", async ({ page }) => {
    const { salesContent } = run();
    const chapter = salesContent.chapters[0];
    await page.goto("/");
    await page.getByRole("link", { name: `Aperçu du cours : ${chapter.title}` }).click();
    await expect(page).toHaveURL(new RegExp(`/apercu/${salesContent.subject.slug}/${chapter.slug}$`));
    const pages = page.locator(".pdf-page");
    await expect(pages).toHaveCount(2, { timeout: 30_000 });
    await expect(pages.first()).toHaveAttribute("data-rendered", "true", { timeout: 30_000 });
    await expect(pages.first().locator(".textLayer")).toContainText("Aperçu gratuit - JuriQuizz");
    await page.getByRole("link", { name: "Voir les pass" }).click();
    await expect(page.locator(".row.offer h2")).toHaveText([
      "Pass Mensuel",
      "Pass Partiels",
      "Pass Année",
      /^Pass Année Premium/,
    ]);
    // Commander demande un compte.
    await page.getByRole("link", { name: "Choisir le Pass Année", exact: true }).click();
    await expect(page).toHaveURL(/\/connexion\?suite=%2Ftarifs%2Fannee$/);
  });

  test("un compte sans pass joue le mini-quiz de démonstration", async ({ page }) => {
    await signUp(page, uniqueEmail("demo"), "");
    await page.getByRole("link", { name: "Essayer le mini-quiz" }).click();
    await expect(page).toHaveURL(/\/demo$/);
    const demoIds = run().demoQuestionIds;
    for (let index = 0; index < demoIds.length; index++) {
      await page.locator(".opt").first().click();
      await expect(page.locator(".verdict")).toBeVisible();
      await page.getByRole("button", { name: /Question suivante|Voir mes résultats/ }).click();
    }
    await expect(page.locator(".save-state")).toContainText("Démonstration : le score n’est pas enregistré.");
    await expect(page.getByRole("link", { name: "Voir les pass" })).toBeVisible();
  });
});

test.describe("vente : cas particuliers (sur ordinateur)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Testé sur ordinateur");
  });

  test("paiement annulé, puis remboursement : l'accès se ferme", async ({ page }) => {
    await signUp(page, uniqueEmail("rembourse"), "");
    await startPayment(page, "annee");
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(page).toHaveURL(/\/tarifs\/annee\?annule=1$/);
    await expect(page.getByText("Paiement annulé : aucun montant n’a été débité.")).toBeVisible();

    const paymentId = await buy(page, "annee", "Payer sans notification");
    // Sans attendre la notification de Stripe, le retour de paiement a déjà ouvert l'accès.
    await expect(page.getByRole("heading", { name: "Merci, ton accès est ouvert" })).toBeVisible();
    const sessions = (await (await fetch(`${STRIPE}/__test/sessions`)).json()) as {
      id: string;
      metadata: { payment_id: string };
    }[];
    const session = sessions.find((item) => item.metadata.payment_id === paymentId)!;
    // La notification arrive ensuite : sans effet en double.
    expect(
      (await (await fetch(`${STRIPE}/__test/notifier/${session.id}`, { method: "POST" })).json()).status,
    ).toBe(200);
    expect(
      (await (await fetch(`${STRIPE}/__test/rembourser/${session.id}`, { method: "POST" })).json()).status,
    ).toBe(200);
    await page.goto("/cours");
    await expect(page).toHaveURL(/\/acces\?suite=%2Fcours$/);
    await page.goto("/compte#achats");
    await expect(page.locator("#achats")).toContainText("Remboursé");
    const { count } = await service
      .from("entitlements")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", paymentId);
    expect(count).toBe(1);
  });

  test("deux appareils au plus : le plus ancien est déconnecté", async ({ browser }) => {
    const email = uniqueEmail("appareils");
    const first = await browser.newContext();
    const firstPage = await first.newPage();
    await signUp(firstPage, email, "");
    for (let i = 0; i < 2; i++) {
      const other = await (await browser.newContext()).newPage();
      await other.goto("/connexion");
      await other.getByLabel("Adresse e-mail").fill(email);
      await other.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
      await other.getByRole("button", { name: "Se connecter" }).click();
      await expect(other).toHaveURL(/\/acces/);
    }
    // Vérification suivante du premier appareil (sinon, au plus tard cinq minutes après).
    const seen = (await first.cookies()).find((cookie) => cookie.name === "jq_appareil_vu")!;
    await first.addCookies([{ ...seen, value: `${seen.value.split(".")[0]}.0` }]);
    await firstPage.goto("/compte");
    await expect(firstPage).toHaveURL(/\/connexion\?erreur=appareils$/);
    await expect(firstPage.getByText(/Tu as été déconnecté de cet appareil/)).toBeVisible();
    await first.close();
  });

  test("pages de vente sans défaut d'accessibilité détectable", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("jq-prefs", JSON.stringify({ decor: "fixe" })));
    const { salesContent, courseChapterSlug } = run();
    await page.goto("/tarifs");
    await audit(page, "tarifs");
    await page.goto("/cgv");
    await audit(page, "cgv");
    await page.goto(`/apercu/${salesContent.subject.slug}/${courseChapterSlug}`);
    await expect(page.locator(".pdf-page").first()).toHaveAttribute("data-rendered", "true", {
      timeout: 30_000,
    });
    await audit(page, "aperçu");
    await signUp(page, uniqueEmail("a11y-vente"), "");
    await audit(page, "mon accès");
    await page.goto("/demo");
    await audit(page, "démonstration");
    await page.goto("/tarifs/partiels");
    await audit(page, "commande");
    await buy(page, "partiels");
    await audit(page, "merci");
    await page.goto(`/cours/${salesContent.subject.slug}/${courseChapterSlug}/lecture`);
    await audit(page, "nom pour le filigrane");
    await page.getByLabel("Prénom et nom").fill("Camille Martin");
    await page.getByRole("button", { name: "Enregistrer et ouvrir le cours" }).click();
    await expect(page.locator(".pdf-page").first()).toHaveAttribute("data-rendered", "true", {
      timeout: 30_000,
    });
    await audit(page, "lecture");
  });
});
