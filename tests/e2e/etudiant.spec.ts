import { expect, test } from "@playwright/test";
import { LEVEL_IDS } from "../../src/lib/levels";
import {
  answer,
  isServerAction,
  logIn,
  logOut,
  nextQuestion,
  questionsOf,
  run,
  signUp,
  uniqueEmail,
  wrongOption,
} from "./support";

test.describe("parcours étudiant", () => {
  test("un invité avec un code bêta crée un compte, parcourt tous les chapitres et niveaux, et retrouve ses scores", async ({
    page,
    isMobile,
  }, testInfo) => {
    const { content } = run();
    const email = uniqueEmail(testInfo.project.name);
    await signUp(page, email);

    // Clair ou sombre, selon l'appareil.
    const dark = testInfo.project.use.colorScheme === "dark";
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      dark ? "rgb(18, 20, 27)" : "rgb(236, 233, 226)",
    );

    await expect(page.getByRole("heading", { name: content.subject.title })).toBeVisible();
    const scores: { href: string; score: number; total: number }[] = [];

    for (const chapter of content.chapters) {
      for (const level of LEVEL_IDS) {
        const questions = questionsOf(chapter, level);
        if (!questions.length) continue;
        const href = `/cours/${content.subject.slug}/${chapter.slug}`;
        await page.goto(href);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(chapter.title);
        await page.locator(`a[href="${href}/${level}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${href}/${level}$`));

        let score = 0;
        for (const [index, question] of questions.entries()) {
          // Le décor (et l'accent de l'interface) suivent la question.
          await expect(page.locator("html")).toHaveAttribute(
            "data-scene",
            question.decor ?? chapter.default_decor,
          );
          await expect(
            page.locator(`[data-decor-layer="${question.decor ?? chapter.default_decor}"]`),
          ).toBeAttached();
          if (question.review_status === "a_relire")
            await expect(page.locator(".kind.review")).toHaveText("En cours de relecture");
          // Une réponse sur deux est juste : on voit les deux corrections.
          const choice = index % 2 === 0 ? question.correct_option : wrongOption(question);
          if (index % 2 === 0) score++;
          await answer(page, question, choice, !isMobile);
          await nextQuestion(page);
        }

        await expect(page.locator(".score")).toHaveText(`${score} sur ${questions.length}`);
        await expect(page.getByText("Score enregistré dans ta progression.")).toBeVisible();
        scores.push({ href, score, total: questions.length });
      }
    }

    // « Refaire mes erreurs » depuis l'écran de résultats : seules les questions manquées reviennent.
    const lastChapter = content.chapters[content.chapters.length - 1];
    const lastLevel = [...LEVEL_IDS].reverse().find((level) => questionsOf(lastChapter, level).length)!;
    const missed = questionsOf(lastChapter, lastLevel).filter((_, index) => index % 2 === 1);
    await page.getByRole("button", { name: "Refaire mes erreurs" }).click();
    await expect(page.locator(".qhead .lvl")).toContainText("(erreurs)");
    for (const question of missed) {
      await answer(page, question, question.correct_option, !isMobile);
      await nextQuestion(page);
    }
    await expect(page.locator(".score")).toHaveText(`${missed.length} sur ${missed.length}`);
    await expect(page.getByRole("button", { name: "Refaire mes erreurs" })).toHaveCount(0);

    // Nouvelle session : les meilleurs scores reviennent depuis le serveur.
    await logOut(page);
    await logIn(page, email);
    for (const { href, score, total } of scores.slice(0, 3)) {
      await page.goto(href);
      await expect(page.getByText(`Meilleur score : ${score} sur ${total}`).first()).toBeVisible();
    }
    await page.goto("/progression");
    await expect(page.getByRole("heading", { name: "Où en es-tu ?" })).toBeVisible();
  });

  test("« Refaire mes erreurs » depuis la page du chapitre reprend les questions manquées", async ({
    page,
    isMobile,
  }, testInfo) => {
    const { content } = run();
    await signUp(page, uniqueEmail(`${testInfo.project.name}-erreurs`));
    const chapter = content.chapters[0];
    const questions = questionsOf(chapter, "facile");
    const href = `/cours/${content.subject.slug}/${chapter.slug}`;
    await page.goto(`${href}/facile`);
    for (const question of questions) {
      await answer(page, question, wrongOption(question), !isMobile);
      await nextQuestion(page);
    }
    await expect(page.getByText("Score enregistré dans ta progression.")).toBeVisible();
    await page.goto(href);
    await expect(
      page.getByText(`${questions.length} erreur${questions.length > 1 ? "s" : ""} à refaire`),
    ).toBeVisible();
    await page.locator(`a[href="${href}/facile?mode=erreurs"]`).click();
    await expect(page.locator(".qhead .count")).toHaveText(`1 sur ${questions.length}`);
    await answer(page, questions[0], questions[0].correct_option, !isMobile);
  });

  test("les réglages de son et de décor sont mémorisés dans le profil", async ({
    page,
    browser,
  }, testInfo) => {
    const email = uniqueEmail(`${testInfo.project.name}-reglages`);
    await signUp(page, email);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-decor", "anime");
    await page.getByRole("button", { name: /^Décor animé/ }).click();
    await expect(html).toHaveAttribute("data-decor", "fixe");
    await page.getByRole("button", { name: /^Décor fixe/ }).click();
    await expect(html).toHaveAttribute("data-decor", "off");
    await expect(page.locator(".scenes")).toHaveCount(0);
    // On attend l'enregistrement du réglage du son dans le profil avant de recharger.
    const saved = page.waitForResponse(
      (response) =>
        isServerAction(response) && (response.request().postData() ?? "").includes('"sound":"off"'),
    );
    await page.getByRole("button", { name: "Son activé" }).click();
    await saved;
    await expect(page.getByRole("button", { name: "Son coupé" })).toHaveAttribute("aria-pressed", "false");

    // Même appareil : le réglage tient après un rechargement.
    await page.reload();
    await expect(html).toHaveAttribute("data-decor", "off");
    await expect(page.getByRole("button", { name: "Son coupé" })).toBeVisible();

    // Autre appareil : le réglage revient avec le compte.
    const other = await browser.newContext({ ...testInfo.project.use });
    const otherPage = await other.newPage();
    await logIn(otherPage, email);
    await expect(otherPage.locator("html")).toHaveAttribute("data-decor", "off");
    await expect(otherPage.getByRole("button", { name: "Son coupé" })).toBeVisible();
    await other.close();
  });

  test("le son démarre au premier geste et s'arrête quand on le coupe", async ({ page }) => {
    // Espion autour de Web Audio : aucun son n'est réellement nécessaire pour le test.
    await page.addInitScript(() => {
      const Original = window.AudioContext;
      const probe = { contexts: [] as AudioContext[] };
      (window as unknown as { __audioProbe: typeof probe }).__audioProbe = probe;
      window.AudioContext = class extends Original {
        constructor(options?: AudioContextOptions) {
          super(options);
          probe.contexts.push(this);
        }
      };
    });
    await page.goto("/");
    const state = () =>
      page.evaluate(() => {
        const probe = (window as unknown as { __audioProbe: { contexts: AudioContext[] } }).__audioProbe;
        return probe.contexts.length ? probe.contexts[0].state : "absent";
      });
    // Rien ne joue avant le premier geste (règle des navigateurs).
    await page.waitForTimeout(500);
    expect(await state()).toBe("absent");
    await page.getByRole("heading", { level: 1 }).click();
    await expect.poll(state).toBe("running");
    await page.getByRole("button", { name: "Son activé" }).click();
    await expect.poll(state, { timeout: 6000 }).toBe("suspended");
  });
});
