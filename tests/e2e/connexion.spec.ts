import { expect, test } from "@playwright/test";
import { lastEmail, logIn, logOut, PASSWORD, run, signUp, uniqueEmail } from "./support";

test.describe("comptes", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith("mobile") && testInfo.title.includes("lien"),
      "Lien e-mail testé sur ordinateur",
    );
  });

  test("inscription par lien e-mail, sans mot de passe, avec le code reçu", async ({ page }) => {
    const email = uniqueEmail("lien");
    await page.goto("/inscription");
    await page.getByLabel("Code d’invitation (facultatif)").fill(run().betaCode);
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Par lien e-mail, sans mot de passe").check();
    await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveCount(0);
    await page.getByLabel(/J’accepte les conditions générales/).check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText(/un e-mail vient de partir/)).toBeVisible();

    const mail = await lastEmail(email);
    const code = mail.text.match(/\b(\d{6})\b/)?.[1];
    expect(code).toBeTruthy();
    await page.getByLabel("Code reçu par e-mail").fill(code!);
    await page.getByRole("button", { name: "Valider le code" }).click();
    await expect(page).toHaveURL(/\/cours$/);

    // Reconnexion avec le lien du message : il ouvre la session directement.
    await logOut(page);
    await page.goto("/connexion");
    await page.getByRole("button", { name: "Lien par e-mail" }).click();
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByRole("button", { name: "Recevoir un lien" }).click();
    await expect(page.getByText(/un e-mail vient de partir/)).toBeVisible();
    await expect
      .poll(async () => (await lastEmail(email)).html.includes("Connexion à JuriQuizz"), { timeout: 15_000 })
      .toBe(true);
    const link = (await lastEmail(email)).html.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1];
    expect(link).toBeTruthy();
    const target = new URL(link!.replaceAll("&amp;", "&"));
    await page.goto(`${target.pathname}${target.search}`);
    await expect(page).toHaveURL(/\/cours$/);
  });

  test("un code bêta invalide est refusé avant la création du compte", async ({ page }) => {
    await page.goto("/inscription");
    await page.getByLabel("Code d’invitation (facultatif)").fill("PAS-UN-CODE");
    await page.getByLabel("Adresse e-mail").fill(uniqueEmail("refus"));
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByLabel(/J’accepte les conditions générales/).check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Ce code bêta n'existe pas. Vérifie l'orthographe.")).toBeVisible();
    await expect(page.getByLabel("Code d’invitation (facultatif)")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/inscription$/);
  });

  test("l'acceptation des conditions d'utilisation est demandée à l'inscription", async ({ page }) => {
    await page.goto("/inscription");
    await page.getByLabel("Adresse e-mail").fill(uniqueEmail("cgu"));
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Accepte les conditions d’utilisation pour créer ton compte.")).toBeVisible();
    await expect(page).toHaveURL(/\/inscription$/);
  });

  test("sans code : compte gratuit, avec la démonstration et les tarifs", async ({ page }) => {
    await signUp(page, uniqueEmail("gratuit"), "");
    await expect(page.getByRole("heading", { name: "Bienvenue sur JuriQuizz" })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link")).toHaveText(["Démo", "Tarifs", "Compte"]);
    // Les cours restent fermés : retour à « Mon accès ».
    await page.goto("/cours");
    await expect(page).toHaveURL(/\/acces\?suite=%2Fcours$/);
  });

  test("les pages de cours demandent une connexion, puis ramènent à la page voulue", async ({ page }) => {
    const email = uniqueEmail("retour");
    await signUp(page, email);
    await logOut(page);
    await page.goto("/progression");
    await expect(page).toHaveURL(/\/connexion\?suite=%2Fprogression$/);
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/progression$/);
  });

  test("mauvais mot de passe : message clair", async ({ page }) => {
    const email = uniqueEmail("mdp");
    await signUp(page, email);
    await logOut(page);
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("pas-le-bon");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
    await logIn(page, email);
  });

  test("suppression du compte", async ({ page }) => {
    const email = uniqueEmail("suppression");
    await signUp(page, email);
    await page.goto("/compte");
    await page.getByLabel("Pour confirmer, écris SUPPRIMER").fill("SUPPRIMER");
    await page.getByRole("button", { name: "Supprimer mon compte" }).click();
    await expect(page.getByText("Ton compte et toutes ses données ont été supprimés.")).toBeVisible();
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
  });
});
