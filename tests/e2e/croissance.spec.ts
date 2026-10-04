import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createServiceClient } from "../../scripts/lib/service-client";
import type { ImportQuestion } from "../../src/lib/content/payload";
import { formatEuros } from "../../src/lib/money";
import { buy, keyFor, run, signUp, uniqueEmail, wrongOption } from "./support";

/*
 * Phase 2 : examens blancs chronométrés, Pass Année Premium et exclusivités, parrainage.
 * Matière de la phase 2 (préparation des tests) : second chapitre Premium, un examen blanc pour
 * tous les pass et un examen blanc Premium, six questions tirées au hasard en 30 minutes.
 */

const service = createServiceClient();

function growth() {
  const { growthContent, exams } = run();
  const questions = growthContent.chapters.flatMap((chapter) => chapter.questions);
  const exam = exams.find((item) => !item.premium)!;
  const premiumExam = exams.find((item) => item.premium)!;
  return {
    subject: growthContent.subject,
    chapters: growthContent.chapters,
    questions,
    exam,
    premiumExam,
    examPath: `/examens/${growthContent.subject.slug}/${exam.slug}`,
  };
}

/** Question affichée par l'épreuve, retrouvée dans le contenu de test par son énoncé. */
async function shownQuestion(page: Page): Promise<ImportQuestion> {
  const prompt = (await page.locator("#examen-question").textContent())?.trim();
  const question = growth().questions.find((item) => item.prompt === prompt);
  if (!question) throw new Error(`Question inconnue : ${prompt}`);
  return question;
}

/** Réponse à la question affichée : au clavier sur ordinateur, au doigt sur mobile. */
async function choose(page: Page, question: ImportQuestion, optionId: string, keyboard: boolean) {
  if (keyboard) await page.keyboard.press(keyFor(question, optionId));
  else await page.locator(`.opt[data-option="${optionId}"]`).click();
  await expect(page.locator(`.opt[data-option="${optionId}"]`)).toHaveAttribute("aria-pressed", "true");
}

async function startExam(page: Page) {
  await page.goto(growth().examPath);
  await page.getByRole("button", { name: "Commencer l’épreuve" }).click();
  await expect(page.locator(".timer")).toHaveText(/^(30:00|29:\d\d)$/);
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

test.describe("examens blancs chronométrés", () => {
  test("épreuve, reprise après rechargement, copie corrigée", async ({ page, isMobile }) => {
    const { exam, examPath } = growth();
    await signUp(page, uniqueEmail("examen"));
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await nav.getByRole("link", { name: "Examens" }).click();
    await expect(page).toHaveURL(/\/examens$/);
    await page.getByRole("link", { name: `Ouvrir : ${exam.title}` }).click();
    await expect(page).toHaveURL(new RegExp(`${examPath}$`));
    await expect(page.locator(".exam-rules")).toContainText("6 questions");

    await page.getByRole("button", { name: "Commencer l’épreuve" }).click();
    await expect(page.locator(".timer")).toHaveText(/^(30:00|29:\d\d)$/);
    await expect(page.locator(".exam-cell")).toHaveCount(6);
    // Pas de correction pendant l'épreuve.
    const first = await shownQuestion(page);
    await choose(page, first, wrongOption(first), !isMobile);
    await expect(page.locator(".verdict")).toHaveCount(0);
    await page.getByRole("button", { name: "Question suivante" }).click();
    const second = await shownQuestion(page);
    await choose(page, second, second.correct_option, !isMobile);

    // La page rechargée reprend l'épreuve : mêmes réponses, chronomètre toujours en marche.
    await page.reload();
    await expect(page.locator(".exam-cell.answered")).toHaveCount(2);
    await expect(page.locator(".exam-count")).toContainText("2 répondues");

    for (let index = 2; index < 6; index++) {
      await page.locator(".exam-cell").nth(index).click();
      await expect(page.locator(".exam-count")).toContainText(`Question ${index + 1} sur 6`);
      const question = await shownQuestion(page);
      await choose(page, question, question.correct_option, !isMobile);
    }
    await page.getByRole("button", { name: "Rendre ma copie" }).click();

    await expect(page).toHaveURL(new RegExp(`${examPath}/copie/`));
    await expect(page.locator(".score")).toHaveText("16,5 / 20");
    await expect(page.locator(".msg")).toContainText("5 bonnes réponses sur 6");
    await expect(page.locator(".review details")).toHaveCount(6);
    await expect(page.locator(".review summary").first()).toContainText("Faux");
    expect(await page.locator(".exam-breakdown li").count()).toBeGreaterThan(0);
    // Brouillon effacé une fois la copie rendue.
    expect(
      await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("jq-examen-"))),
    ).toEqual([]);

    await page.getByRole("link", { name: "Tous les examens" }).click();
    await expect(page.locator(".row").filter({ hasText: exam.title })).toContainText(
      "Meilleure note : 16,5/20",
    );
    await page.goto("/progression");
    await expect(page.locator(".exam-breakdown")).toContainText(`${exam.title}`);
  });

  test.describe("sur ordinateur", () => {
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name.startsWith("mobile"), "Testé sur ordinateur");
    });

    test("à la fin du temps, la copie part d'elle-même", async ({ page }) => {
      await page.clock.install();
      await signUp(page, uniqueEmail("chrono"));
      await startExam(page);
      const question = await shownQuestion(page);
      await choose(page, question, question.correct_option, true);
      await page.clock.fastForward("25:30");
      await expect(page.locator(".timer")).toHaveClass(/low/);
      await page.clock.fastForward("05:00");
      await expect(page).toHaveURL(/\/copie\//);
      await expect(page.locator(".msg")).toContainText("1 bonne réponse sur 6");
      await expect(page.getByText("Copie rendue après la fin du temps")).toHaveCount(0);
    });

    test("page fermée pendant l'épreuve : la copie est rendue hors délai au retour", async ({ page }) => {
      await signUp(page, uniqueEmail("hors-delai"));
      await startExam(page);
      const question = await shownQuestion(page);
      await choose(page, question, question.correct_option, true);
      const attemptId = await page.evaluate(() =>
        Object.keys(localStorage)
          .find((key) => key.startsWith("jq-examen-"))!
          .slice("jq-examen-".length),
      );
      // Une heure plus tard (on recule l'épreuve).
      const moved = await service
        .from("exam_attempts")
        .update({
          started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
          deadline: new Date(Date.now() - 30 * 60_000).toISOString(),
        })
        .eq("id", attemptId);
      expect(moved.error).toBeNull();
      await page.goto(growth().examPath);
      await expect(page).toHaveURL(new RegExp(`/copie/${attemptId}$`));
      await expect(
        page.getByText("Copie rendue après la fin du temps : la note est indicative."),
      ).toBeVisible();
      await expect(page.locator(".msg")).toContainText("1 bonne réponse sur 6");
    });
  });
});

test.describe("Pass Année Premium et parrainage (sur ordinateur)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Testé sur ordinateur");
  });

  test("les exclusivités Premium, puis le passage depuis un Pass Année", async ({ page }) => {
    const { subject, chapters, premiumExam } = growth();
    const premiumChapter = chapters[1];
    await signUp(page, uniqueEmail("premium"), "");
    const passId = await buy(page, "annee");

    // Avec le Pass Année : le chapitre et l'examen Premium restent réservés.
    await page.goto("/cours");
    // Les matières de test partagent les titres de chapitres : on s'en tient à celle de la phase 2.
    const row = page.locator(`[id="${subject.slug}"] .row`).filter({ hasText: premiumChapter.title });
    await expect(row).toContainText("Exclusivité du Pass Année Premium");
    await page.goto(`/cours/${subject.slug}/${premiumChapter.slug}`);
    await expect(page.getByRole("heading", { name: "Chapitre réservé au Pass Année Premium" })).toBeVisible();
    await audit(page, "chapitre Premium verrouillé");
    await page.goto("/examens");
    await expect(page.getByRole("link", { name: `Premium : ${premiumExam.title}` })).toBeVisible();

    // Prix du passage : le Pass Année payé est déduit.
    const [{ data: plan }, { data: pass }] = await Promise.all([
      service.from("plans").select("price_cents").eq("id", "pass_annee_premium").single(),
      service.from("payments").select("amount_cents").eq("id", passId).single(),
    ]);
    const due = plan!.price_cents - pass!.amount_cents;
    await page.goto("/tarifs");
    const offer = page.locator(".row.offer").filter({ hasText: "Pass Année Premium" });
    await expect(offer.locator(".exclusives li")).toHaveCount(2);
    await expect(offer).toContainText(`Pour toi : ${formatEuros(due)}`);
    await offer.getByRole("link", { name: "Choisir le Pass Année Premium" }).click();
    const summary = page.locator(".order-summary");
    await expect(summary).toContainText("plus les exclusivités Premium");
    await expect(summary).toContainText(`Pass Année en cours déduit−${formatEuros(pass!.amount_cents)}`);
    await expect(summary).toContainText(`À payer${formatEuros(due)} TTC`);
    await expect(page.getByRole("button", { name: `Payer ${formatEuros(due)}` })).toBeVisible();
    await audit(page, "commande avec réduction");

    const premiumId = await buy(page, "premium");
    const { data: paid } = await service.from("payments").select("amount_cents").eq("id", premiumId).single();
    expect(paid!.amount_cents).toBe(due);
    await page.goto(`/cours/${subject.slug}/${premiumChapter.slug}`);
    await expect(page.getByRole("heading", { name: "Choisis ton niveau" })).toBeVisible();
    await page.goto("/tarifs");
    await expect(page.locator(".row.offer").filter({ hasText: "Pass Année Premium" })).toContainText(
      "Déjà inclus dans ton accès",
    );
    await page.goto("/compte#achats");
    await expect(page.locator("#achats")).toContainText(
      `Pass Année déduit : −${formatEuros(pass!.amount_cents)}`,
    );
  });

  test("parrainage : réduction pour le filleul, jours offerts au parrain", async ({ page, browser }) => {
    await signUp(page, uniqueEmail("parrain"), "");
    await page.goto("/compte");
    await page.getByRole("link", { name: "Mon lien de parrainage" }).click();
    const link = await page.getByLabel("Ton lien d’invitation").inputValue();
    expect(link).toMatch(/\/inscription\?parrain=[A-Z2-9]{8}$/);

    // Le filleul, sur un autre appareil.
    const context = await browser.newContext({ locale: "fr-FR" });
    const friend = await context.newPage();
    const invitation = new URL(link);
    await friend.goto(`${invitation.pathname}${invitation.search}`);
    await expect(
      friend.getByText("Invitation de parrainage : 2 € de réduction sur ton premier pass"),
    ).toBeVisible();
    await signUp(friend, uniqueEmail("filleul"), "", `${invitation.pathname}${invitation.search}`);
    await expect(
      friend.getByText("Invitation de parrainage : 2 € de réduction sur ton premier pass"),
    ).toBeVisible();
    const { data: plan } = await service
      .from("plans")
      .select("price_cents")
      .eq("id", "pass_mensuel")
      .single();
    await friend.goto("/tarifs/mensuel");
    const summary = friend.locator(".order-summary");
    await expect(summary).toContainText("Réduction de parrainage−2 €");
    await expect(summary).toContainText(`À payer${formatEuros(plan!.price_cents - 200)} TTC`);
    await buy(friend, "mensuel");
    await expect(friend.getByRole("heading", { name: "Merci, ton accès est ouvert" })).toBeVisible();
    await context.close();

    // Le parrain : sept jours offerts, à la suite de son accès (ici, à partir d'aujourd'hui).
    await page.reload();
    await expect(page.locator(".stats-grid .stat b")).toHaveText(["1", "1", "7"]);
    await page.goto("/compte");
    await expect(page.getByText("Jours offerts (parrainage)")).toBeVisible();
    await page.goto("/cours");
    await expect(page).toHaveURL(/\/cours$/);
  });

  test("pages de la phase 2 sans défaut d'accessibilité détectable", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("jq-prefs", JSON.stringify({ decor: "fixe" })));
    await signUp(page, uniqueEmail("a11y-croissance"));
    await page.goto("/examens");
    await audit(page, "examens");
    await page.goto(growth().examPath);
    await audit(page, "examen");
    await page.getByRole("button", { name: "Commencer l’épreuve" }).click();
    await expect(page.locator(".timer")).toBeVisible();
    const question = await shownQuestion(page);
    await choose(page, question, question.correct_option, true);
    await audit(page, "épreuve");
    await page.getByRole("button", { name: "Rendre ma copie" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await audit(page, "confirmation");
    await page.getByRole("alertdialog").getByRole("button", { name: "Rendre ma copie" }).click();
    await expect(page).toHaveURL(/\/copie\//);
    await audit(page, "copie corrigée");
    await page.goto("/parrainage");
    await audit(page, "parrainage");
    await page.goto("/tarifs");
    await audit(page, "tarifs avec le Premium");
  });
});
