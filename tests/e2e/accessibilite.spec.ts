import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { questionsOf, run, signUp, uniqueEmail } from "./support";

/** Contrôle automatique (WCAG 2.1 A et AA) : les problèmes détectables par un outil. */
async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.help}`);
  expect(summary, label).toEqual([]);
}

test("pages principales sans défaut d'accessibilité détectable, en clair et en sombre", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.startsWith("mobile"),
    "Contrôle fait sur ordinateur, en clair et en sombre",
  );
  // Décor fixe : l'outil analyse une page stable.
  await page.addInitScript(() => localStorage.setItem("jq-prefs", JSON.stringify({ decor: "fixe" })));
  await page.goto("/");
  await audit(page, "accueil");
  await page.goto("/inscription");
  await audit(page, "inscription");
  await page.goto("/connexion");
  await audit(page, "connexion");
  await page.goto("/a-propos");
  await audit(page, "à propos");

  const { content } = run();
  await signUp(page, uniqueEmail(`${testInfo.project.name}-a11y`));
  await audit(page, "catalogue");
  const chapter = content.chapters[0];
  await page.goto(`/cours/${content.subject.slug}/${chapter.slug}`);
  await audit(page, "chapitre");
  await page.goto(`/cours/${content.subject.slug}/${chapter.slug}/facile`);
  await audit(page, "question");
  const question = questionsOf(chapter, "facile")[0];
  await page.locator(`.opt[data-option="${question.correct_option}"]`).click();
  await expect(page.locator(".verdict")).toBeVisible();
  await audit(page, "correction");
  await page.goto("/compte");
  await audit(page, "compte");
  await page.goto("/progression");
  await audit(page, "progression");
});

test("le quiz se joue entièrement au clavier", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Clavier testé sur ordinateur");
  const { content } = run();
  await signUp(page, uniqueEmail(`${testInfo.project.name}-clavier`));
  const chapter = content.chapters[0];
  const questions = questionsOf(chapter, "facile");
  await page.goto(`/cours/${content.subject.slug}/${chapter.slug}/facile`);
  // Le titre de la question reçoit le focus à chaque nouvelle question.
  await expect(page.locator("h2.q")).toBeFocused();
  await page.keyboard.press("1");
  await expect(page.locator(".verdict")).toBeVisible();
  // Après la réponse, « Question suivante » a le focus : Entrée suffit pour continuer.
  await expect(page.getByRole("button", { name: /Question suivante|Voir mes résultats/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".qhead .count")).toHaveText(`2 sur ${questions.length}`);
  await expect(page.locator("h2.q")).toBeFocused();
});
