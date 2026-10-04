import { readFileSync } from "node:fs";
import { expect, type Page, type Response } from "@playwright/test";
import type { ImportChapter, ImportPayload, ImportQuestion } from "../../src/lib/content/payload";
import type { Database } from "../../src/lib/supabase/database.types";

export const RUN_FILE = "tests/e2e/.auth/run.json";
export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export type RunData = {
  runId: string;
  betaCode: string;
  adminEmail: string;
  adminPassword: string;
  /** Matière parcourue par les étudiants. */
  content: ImportPayload;
  /** Matière réservée aux tests d'administration (masquage, relecture). */
  adminContent: ImportPayload;
  /** Matière des tests de vente : questions de démonstration et cours en PDF. */
  salesContent: ImportPayload;
  demoQuestionIds: string[];
  /** Chapitre de la matière de vente qui a un cours en PDF (3 pages, 2 en aperçu). */
  courseChapterSlug: string;
  /** Matière de la phase 2 : second chapitre réservé au Premium, deux examens blancs (dont un Premium). */
  growthContent: ImportPayload;
  exams: { title: string; slug: string; premium: boolean }[];
  createdSubjects: string[];
  /** Ce que la préparation a modifié en base, rétabli à la fin. */
  restore: {
    legalPages: { slug: string; body: string }[];
    examSessionIds: string[];
    plans: { id: Database["public"]["Enums"]["plan"]; on_sale: boolean }[];
    storagePaths: string[];
    /** Réglages du parrainage avant les tests. */
    settings: {
      referral_enabled: boolean;
      referral_discount_cents: number;
      referral_bonus_days: number;
      referral_max_per_year: number;
    } | null;
  };
};

export function run(): RunData {
  return JSON.parse(readFileSync(RUN_FILE, "utf8")) as RunData;
}

export const PASSWORD = "motdepasse-de-test";

export function uniqueEmail(label: string): string {
  return `e2e-${run().runId}-${label}-${Math.random().toString(36).slice(2, 8)}@example.com`.toLowerCase();
}

/**
 * Inscription avec le code d'invitation de la bêta (accès complet), ou sans code (code = "").
 * `from` : page d'inscription à ouvrir (lien de parrainage, par exemple).
 */
export async function signUp(
  page: Page,
  email: string,
  code = run().betaCode,
  from = "/inscription",
): Promise<void> {
  await page.goto(from);
  if (code) await page.getByLabel("Code d’invitation (facultatif)").fill(code);
  await page.getByLabel("Pseudo (facultatif)").fill("Testeur");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/J’accepte les conditions générales/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(code ? /\/cours$/ : /\/acces$/);
}

export async function logIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/cours$/);
}

export async function logOut(page: Page): Promise<void> {
  await page.goto("/compte");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/$/);
}

export function questionsOf(chapter: ImportChapter, level: string): ImportQuestion[] {
  return chapter.questions.filter((question) => question.level === level);
}

/** Touche du clavier qui choisit une option : V/F pour un vrai/faux, sinon A, B, C… */
export function keyFor(question: ImportQuestion, optionId: string): string {
  if (question.type === "vrai_faux") return optionId;
  return "abcdef".charAt(question.options.findIndex((option) => option.id === optionId));
}

export function wrongOption(question: ImportQuestion): string {
  return question.options.find((option) => option.id !== question.correct_option)!.id;
}

/** Joue une question : choix au clavier sur ordinateur, au doigt sur mobile. */
export async function answer(page: Page, question: ImportQuestion, optionId: string, useKeyboard: boolean) {
  await expect(page.locator("h2.q")).toHaveText(question.prompt);
  if (useKeyboard) await page.keyboard.press(keyFor(question, optionId));
  else await page.locator(`.opt[data-option="${optionId}"]`).click();
  const good = optionId === question.correct_option;
  await expect(page.locator(".verdict")).toHaveText(good ? "Bonne réponse" : "Pas tout à fait");
  await expect(page.locator(".exp p").first()).toHaveText(question.explanation[0]);
}

export async function nextQuestion(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Question suivante|Voir mes résultats/ }).click();
}

/** Dernier e-mail reçu par une adresse (serveur de messagerie de test de Supabase). */
export async function lastEmail(to: string): Promise<{ text: string; html: string }> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const list = (await search.json()) as { messages: { ID: string }[] };
    if (list.messages?.length) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${list.messages[0].ID}`);
      const body = (await message.json()) as { Text: string; HTML: string };
      return { text: body.Text, html: body.HTML };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Aucun e-mail reçu pour ${to}`);
}

/** Réponse d'une action serveur (enregistrement d'un réglage, d'un score…). */
export function isServerAction(response: Response): boolean {
  return response.request().method() === "POST" && "next-action" in response.request().headers();
}

/** Commande d'un pass jusqu'à la page de paiement (du faux Stripe). */
export async function startPayment(page: Page, slug: string): Promise<void> {
  await page.goto(`/tarifs/${slug}`);
  await page.getByLabel(/J’ai lu et j’accepte les/).check();
  await page.getByLabel(/Je demande l’accès immédiat/).check();
  await page.getByRole("button", { name: /^Payer/ }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/pay\/cs_test_/);
}

/** Achat d'un pass jusqu'au retour sur JuriQuizz ; renvoie l'identifiant de l'achat. */
export async function buy(page: Page, slug: string, button = "Payer"): Promise<string> {
  await startPayment(page, slug);
  await page.getByRole("button", { name: button, exact: true }).click();
  await expect(page).toHaveURL(/\/paiement\/merci\?achat=/);
  return new URL(page.url()).searchParams.get("achat")!;
}
