import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { answer, logIn, nextQuestion, questionsOf, run, signUp, uniqueEmail, wrongOption } from "./support";

/*
 * L'administration agit sur une matière de test à part (masquage, relecture) : les autres
 * parcours, joués en parallèle, ne sont pas touchés. Un seul appareil suffit ici.
 */
test.describe.configure({ mode: "serial" });

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur-clair", "Administration testée sur un seul appareil");
});

async function adminPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();
  const { adminEmail, adminPassword } = run();
  await logIn(page, adminEmail, adminPassword);
  return page;
}

test("l'administration voit les statistiques et les retours, change un statut et masque une matière", async ({
  page,
  browser,
}) => {
  const { adminContent } = run();
  const subject = adminContent.subject;
  const chapter = adminContent.chapters[0];
  const questions = questionsOf(chapter, "facile");
  const chapterHref = `/cours/${subject.slug}/${chapter.slug}`;

  // Un étudiant joue le niveau et signale la première question.
  await signUp(page, uniqueEmail("etudiant-admin"));
  await page.goto(`${chapterHref}/facile`);
  await answer(page, questions[0], wrongOption(questions[0]), true);
  await page.getByRole("button", { name: "Pas vraiment" }).click();
  await page.getByPlaceholder("Qu'est-ce qui est confus ? (facultatif)").fill("La consigne est ambiguë.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Merci, ton retour a bien été transmis.")).toBeVisible();
  await nextQuestion(page);
  for (const question of questions.slice(1)) {
    await answer(page, question, question.correct_option, true);
    await nextQuestion(page);
  }
  await expect(page.getByText("Score enregistré dans ta progression.")).toBeVisible();

  const admin = await adminPage(browser);

  // Statistiques par question et retours.
  await admin.goto(`/admin/questions/${questions[0].id}`);
  await expect(admin.getByText("Réponses choisies (1, premières tentatives)")).toBeVisible();
  await expect(admin.getByText("La consigne est ambiguë.")).toBeVisible();
  await admin.goto("/admin/retours");
  await expect(admin.getByText("La consigne est ambiguë.")).toBeVisible();
  await admin.goto(`/admin/questions?matiere=&tri=reussite`);
  const row = admin.locator("tbody tr").filter({ hasText: questions[0].id });
  await expect(row.locator("td").nth(3)).toHaveText("0 %");

  // Statut de relecture : « à corriger » retire la question aux étudiants.
  await row.locator("select").selectOption("a_corriger");
  await row.getByRole("button", { name: "Enregistrer" }).click();
  await expect(admin.locator("tbody tr").filter({ hasText: questions[0].id }).locator(".pill")).toHaveText(
    "À corriger (masquée)",
  );
  await page.goto(`${chapterHref}/facile`);
  await expect(page.locator(".qhead .count")).toHaveText(`1 sur ${questions.length - 1}`);
  await expect(page.locator("h2.q")).toHaveText(questions[1].prompt);

  // Droit de retrait : la matière masquée disparaît pour les étudiants, en un clic.
  await admin.goto("/admin/matieres");
  const section = admin.locator("section").filter({ hasText: subject.title });
  await section.getByRole("button", { name: "Masquer cette matière" }).click();
  await expect(section.getByText("Masquée", { exact: true })).toBeVisible();
  await page.goto("/cours");
  await expect(page.getByRole("heading", { name: subject.title })).toHaveCount(0);
  const hidden = await page.goto(chapterHref);
  expect(hidden?.status()).toBe(404);

  await section.getByRole("button", { name: "Rendre visible" }).click();
  await expect(section.getByText("Visible", { exact: true })).toBeVisible();
  await page.goto("/cours");
  await expect(page.getByRole("heading", { name: subject.title })).toBeVisible();
  await admin.context().close();
});

test("l'administration crée un code bêta qui permet de s'inscrire", async ({ page, browser }) => {
  const admin = await adminPage(browser);
  await admin.goto("/admin/codes");
  await admin.getByLabel("Nombre de codes").fill("1");
  await admin.getByLabel("Utilisations par code").fill("1");
  await admin.getByLabel("Libellé (pour s’y retrouver)").fill(`e2e ${run().runId}`);
  await admin.getByRole("button", { name: "Créer" }).click();
  await expect(admin).toHaveURL(/nouveaux=/);
  const code = decodeURIComponent(new URL(admin.url()).searchParams.get("nouveaux")!);
  expect(code).toMatch(/^JQ-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await expect(admin.locator("tbody tr").filter({ hasText: code })).toContainText("0 / 1");

  await signUp(page, uniqueEmail("nouveau-code"), code.toLowerCase());
  await admin.reload();
  await expect(admin.locator("tbody tr").filter({ hasText: code })).toContainText("1 / 1");
  await admin.context().close();
});

test("les pages d'administration sont introuvables pour un étudiant", async ({ page }) => {
  await signUp(page, uniqueEmail("curieux"));
  const response = await page.goto("/admin/codes");
  expect(response?.status()).toBe(404);
});

test("l'administration crée, publie et supprime un examen blanc", async ({ browser }) => {
  const { adminContent, runId } = run();
  const admin = await adminPage(browser);
  await admin.goto("/admin/examens");
  const create = admin
    .locator("section")
    .filter({ has: admin.getByRole("heading", { name: "Nouvel examen" }) });
  await create.getByLabel("Matière").selectOption({ label: adminContent.subject.title });
  await create.getByLabel("Titre").fill(`Examen admin ${runId}`);
  await create.getByLabel("Nombre de questions").fill("5");
  await create.getByLabel("Durée (minutes)").fill("20");
  await create.getByRole("button", { name: "Créer l’examen" }).click();
  await expect(create.getByText("Examen créé.")).toBeVisible();

  const section = admin
    .locator("section")
    .filter({ has: admin.getByRole("heading", { name: /^Examen admin/ }) });
  await expect(section.getByRole("heading")).toContainText("Masqué");
  await expect(section).toContainText("jamais publié");
  await expect(section.getByRole("button", { name: /^Supprimer/ })).toBeVisible();

  // Proposé aux étudiants : publié, il ne se supprime plus et ne peut plus devenir Premium.
  await section.getByText("Modifier").click();
  await section.getByLabel("Proposé aux étudiants").check();
  await section.getByRole("button", { name: "Enregistrer l’examen" }).click();
  await expect(section.getByText("Examen enregistré.")).toBeVisible();
  await admin.reload();
  await expect(section.getByRole("heading")).toContainText("Proposé");
  await expect(section.getByRole("button", { name: /^Supprimer/ })).toHaveCount(0);
  await section.getByText("Modifier").click();
  await expect(section.getByLabel("Réservé au Pass Année Premium")).toBeDisabled();

  // Un brouillon jamais publié se supprime.
  await create.getByLabel("Matière").selectOption({ label: adminContent.subject.title });
  await create.getByLabel("Titre").fill(`Brouillon ${runId}`);
  await create.getByRole("button", { name: "Créer l’examen" }).click();
  await expect(create.getByText("Examen créé.")).toBeVisible();
  const draft = admin.locator("section").filter({ has: admin.getByRole("heading", { name: /^Brouillon/ }) });
  await draft.getByRole("button", { name: /^Supprimer/ }).click();
  await expect(draft).toHaveCount(0);
  await admin.context().close();
});

test("les réglages de la phase 2 proposent les clauses des CGV", async ({ browser }) => {
  const admin = await adminPage(browser);
  await admin.goto("/admin/reglages");
  await expect(admin.getByLabel(/Débloquer le niveau suivant/)).toBeVisible();
  await expect(admin.getByLabel(/Parrainage ouvert/)).toBeChecked();
  await admin.getByText("Clause proposée : parrainage").click();
  await expect(admin.locator(".clause").first()).toContainText("7 jours d'accès offerts");
  await admin.goto("/admin/vente");
  await expect(admin.getByText(/Exclusivités réellement disponibles : \d+/)).toBeVisible();
  await admin.context().close();
});

test("les pages d'administration n'ont pas de défaut d'accessibilité détectable", async ({ browser }) => {
  const admin = await adminPage(browser);
  await admin.addInitScript(() => localStorage.setItem("jq-prefs", JSON.stringify({ decor: "fixe" })));
  for (const path of [
    "/admin",
    "/admin/questions",
    "/admin/matieres",
    "/admin/cours",
    "/admin/examens",
    "/admin/vente",
    "/admin/achats",
    "/admin/reglages",
    "/admin/textes",
    "/admin/codes",
    "/admin/retours",
  ]) {
    await admin.goto(path);
    const results = await new AxeBuilder({ page: admin })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.help}`),
      path,
    ).toEqual([]);
  }
  await admin.context().close();
});
