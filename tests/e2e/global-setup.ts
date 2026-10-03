import { mkdirSync, writeFileSync } from "node:fs";
import { createServiceClient } from "../../scripts/lib/service-client";
import { loadContentFile } from "../../scripts/lib/load-content";
import type { ImportPayload } from "../../src/lib/content/payload";
import { RUN_FILE, type RunData } from "./support";

/** Copie de la matière d'exemple, à part, pour les tests qui masquent ou retirent du contenu. */
function adminCopy(payload: ImportPayload, runId: string): ImportPayload {
  return {
    subject: { slug: `matiere-admin-${runId.toLowerCase()}`, title: `Matière de test ${runId}` },
    chapters: payload.chapters.map((chapter) => ({
      ...chapter,
      questions: chapter.questions.map((question) => ({
        ...question,
        id: `adm-${runId.toLowerCase()}-${question.id}`,
      })),
    })),
  };
}

export default async function globalSetup() {
  const client = createServiceClient();
  const runId = Date.now().toString(36).toUpperCase();
  const content = loadContentFile(process.env.E2E_CONTENT ?? "tests/fixtures/matiere-exemple.json").payload;
  const adminContent = adminCopy(loadContentFile("tests/fixtures/matiere-exemple.json").payload, runId);
  const createdSubjects: string[] = [];

  for (const payload of [content, adminContent]) {
    const { data, error } = await client.rpc("import_subject", { p_payload: payload, p_publish: true });
    if (error) throw new Error(`Import du contenu de test impossible : ${error.message}`);
    const report = data as { subject_id: string; subject_created: boolean };
    if (report.subject_created) createdSubjects.push(report.subject_id);
  }

  // Les statuts de relecture en base priment sur ceux du fichier (ils ont pu être changés dans
  // l'administration) : on garde ceux de la base, et seulement les questions visibles des étudiants.
  for (const payload of [content, adminContent]) {
    const ids = payload.chapters.flatMap((chapter) => chapter.questions.map((question) => question.id));
    const { data: rows, error } = await client
      .from("questions")
      .select("id, review_status, retired_at")
      .in("id", ids);
    if (error) throw new Error(error.message);
    const status = new Map(rows.map((row) => [row.id, row]));
    for (const chapter of payload.chapters) {
      chapter.questions = chapter.questions
        .map((question) => ({ ...question, review_status: status.get(question.id)!.review_status }))
        .filter(
          (question) => question.review_status !== "a_corriger" && !status.get(question.id)!.retired_at,
        );
    }
  }

  const betaCode = `E2E-${runId}`;
  const codeInsert = await client
    .from("beta_codes")
    .insert({ code: betaCode, uses_max: 500, label: "tests de parcours" });
  if (codeInsert.error) throw new Error(codeInsert.error.message);

  const adminEmail = `e2e-${runId.toLowerCase()}-admin@example.com`;
  const adminPassword = `admin-${runId}-motdepasse`;
  const created = await client.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { display_name: "Admin des tests" },
  });
  if (created.error) throw new Error(created.error.message);
  const adminInsert = await client.from("admins").insert({ user_id: created.data.user.id });
  if (adminInsert.error) throw new Error(adminInsert.error.message);

  const data: RunData = {
    runId,
    betaCode,
    adminEmail,
    adminPassword,
    content,
    adminContent,
    createdSubjects,
  };
  mkdirSync("tests/e2e/.auth", { recursive: true });
  writeFileSync(RUN_FILE, JSON.stringify(data));
}
