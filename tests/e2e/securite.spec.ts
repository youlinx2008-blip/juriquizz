import { expect, test, type Page } from "@playwright/test";
import { run, signUp, uniqueEmail } from "./support";

/*
 * En-têtes de sécurité et politique de sécurité du contenu : rien de ce que le site utilise
 * (scripts, styles, lecteur de PDF, service worker) ne doit être bloqué.
 */

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur-clair", "Vérifié sur un seul appareil");
});

/** Messages de la console signalant un blocage par la politique de sécurité du contenu. */
function watchViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/content security policy/i.test(message.text())) violations.push(`${page.url()} : ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    if (/content security policy|unsafe-eval/i.test(error.message)) violations.push(error.message);
  });
  return violations;
}

test("en-têtes de sécurité et politique propre à chaque requête", async ({ page }) => {
  const first = await page.goto("/");
  const headers = first!.headers();
  const policy = headers["content-security-policy"];
  expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain("unsafe-eval");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
  // Un nonce neuf à chaque page.
  const second = await page.goto("/");
  expect(second!.headers()["content-security-policy"]).not.toBe(policy);
});

test("la politique de sécurité du contenu ne bloque rien sur les pages principales", async ({ page }) => {
  const violations = watchViolations(page);
  const { content, salesContent, courseChapterSlug } = run();
  for (const path of ["/", "/tarifs", "/connexion", "/inscription", "/a-propos", "/cgv"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
  }
  await signUp(page, uniqueEmail("csp"));
  const chapter = content.chapters[0];
  await page.goto(`/cours/${content.subject.slug}/${chapter.slug}/facile`);
  await page.locator(".opt").first().click();
  await expect(page.locator(".verdict")).toBeVisible();
  await page.goto("/examens");
  await page.goto("/compte");
  // Lecteur de PDF : bibliothèque et worker chargés, pages dessinées.
  await page.goto(`/cours/${salesContent.subject.slug}/${courseChapterSlug}/lecture`);
  await page.getByLabel("Prénom et nom").fill("Camille Martin");
  await page.getByRole("button", { name: "Enregistrer et ouvrir le cours" }).click();
  await expect(page.locator(".pdf-page").first()).toHaveAttribute("data-rendered", "true", {
    timeout: 30_000,
  });
  expect(violations).toEqual([]);
});
