import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createServiceClient } from "../../scripts/lib/service-client";
import { loadContentFile } from "../../scripts/lib/load-content";
import type { ImportPayload } from "../../src/lib/content/payload";
import { RUN_FILE, type RunData } from "./support";

/** Copie de la matière d'exemple, à part (masquage, relecture, vente…), avec ses propres identifiants. */
function copyOf(payload: ImportPayload, prefix: string, runId: string, title: string): ImportPayload {
  const id = `${prefix}-${runId.toLowerCase()}`;
  return {
    subject: { slug: `matiere-${id}`, title: `${title} ${runId}` },
    chapters: payload.chapters.map((chapter) => ({
      ...chapter,
      questions: chapter.questions.map((question) => ({ ...question, id: `${id}-${question.id}` })),
    })),
  };
}

/** Cours en PDF d'exemple : 3 pages, la première est le sommaire. */
async function samplePdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const titles = ["Sommaire du cours d'exemple", "Première partie", "Deuxième partie"];
  titles.forEach((title, index) => {
    const page = pdf.addPage([595, 842]);
    page.drawText(title, { x: 60, y: 760, size: 22, font });
    page.drawText(`Page ${index + 1} sur ${titles.length}`, { x: 60, y: 720, size: 12, font });
  });
  return pdf.save();
}

export default async function globalSetup() {
  const client = createServiceClient();
  const runId = Date.now().toString(36).toUpperCase();
  const example = loadContentFile("tests/fixtures/matiere-exemple.json").payload;
  const content = loadContentFile(process.env.E2E_CONTENT ?? "tests/fixtures/matiere-exemple.json").payload;
  const adminContent = copyOf(example, "admin", runId, "Matière de test");
  const salesContent = copyOf(example, "vente", runId, "Matière de vente");
  const growthContent = copyOf(example, "croissance", runId, "Matière Premium");
  // Second chapitre réservé au Pass Année Premium dès sa publication.
  growthContent.chapters[1] = { ...growthContent.chapters[1], premium: true };
  const createdSubjects: string[] = [];

  for (const payload of [content, adminContent, salesContent, growthContent]) {
    const { data, error } = await client.rpc("import_subject", { p_payload: payload, p_publish: true });
    if (error) throw new Error(`Import du contenu de test impossible : ${error.message}`);
    const report = data as { subject_id: string; subject_created: boolean };
    if (report.subject_created) createdSubjects.push(report.subject_id);
  }

  // Démonstration : deux questions relues de la matière de vente.
  const demoQuestionIds = salesContent.chapters[0].questions.slice(0, 2).map((question) => question.id);
  const demo = await client
    .from("questions")
    .update({ demo: true, review_status: "relue" })
    .in("id", demoQuestionIds);
  if (demo.error) throw new Error(demo.error.message);

  // Matière de la phase 2 : tout est relu (contenu proposé aux acheteurs, exclusivités Premium).
  const growthIds = growthContent.chapters.flatMap((chapter) =>
    chapter.questions.map((question) => question.id),
  );
  const relue = await client.from("questions").update({ review_status: "relue" }).in("id", growthIds);
  if (relue.error) throw new Error(relue.error.message);

  // Les statuts de relecture en base priment sur ceux du fichier (ils ont pu être changés dans
  // l'administration) : on garde ceux de la base, et seulement les questions visibles des étudiants.
  for (const payload of [content, adminContent, salesContent, growthContent]) {
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

  // Cours en PDF du premier chapitre de la matière de vente.
  const courseChapterSlug = salesContent.chapters[0].slug;
  const { data: chapter, error: chapterError } = await client
    .from("chapters")
    .select("id, subjects!inner(slug)")
    .eq("slug", courseChapterSlug)
    .eq("subjects.slug", salesContent.subject.slug)
    .single();
  if (chapterError) throw new Error(chapterError.message);
  const pdf = await samplePdf();
  const storagePath = `${chapter.id}/${randomUUID()}.pdf`;
  const upload = await client.storage
    .from("cours")
    .upload(storagePath, pdf, { contentType: "application/pdf", upsert: false });
  if (upload.error) throw new Error(`Dépôt du PDF de test impossible : ${upload.error.message}`);
  const document = await client.from("course_documents").insert({
    chapter_id: chapter.id,
    storage_path: storagePath,
    title: "Cours d'exemple",
    page_count: 3,
    preview_pages: 2,
    file_size: pdf.byteLength,
  });
  if (document.error) throw new Error(document.error.message);

  // Examens blancs de la matière de la phase 2 : l'un pour tous les pass, l'autre Premium.
  const { data: growthSubject, error: growthError } = await client
    .from("subjects")
    .select("id")
    .eq("slug", growthContent.subject.slug)
    .single();
  if (growthError) throw new Error(growthError.message);
  const exams = [
    { title: `Examen blanc ${runId}`, slug: "examen-blanc", premium: false },
    { title: `Examen blanc Premium ${runId}`, slug: "examen-premium", premium: true },
  ];
  const examInsert = await client.from("mock_exams").insert(
    exams.map((exam, position) => ({
      subject_id: growthSubject.id,
      slug: exam.slug,
      title: exam.title,
      description: "Toute la matière, tous niveaux.",
      question_count: 6,
      duration_minutes: 30,
      levels: ["facile", "intermediaire", "confirme"] as ("facile" | "intermediaire" | "confirme")[],
      premium: exam.premium,
      visible: true,
      position,
    })),
  );
  if (examInsert.error) throw new Error(examInsert.error.message);

  // Vente ouverte le temps des tests : textes légaux complétés, dates de partiels, offres en vente.
  const restore: RunData["restore"] = {
    legalPages: [],
    examSessionIds: [],
    plans: [],
    storagePaths: [storagePath],
    settings: null,
  };
  const { data: legal } = await client.from("legal_pages").select("slug, body");
  for (const page of legal ?? []) {
    if (!page.body.includes("[À COMPLÉTER")) continue;
    restore.legalPages.push({ slug: page.slug, body: page.body });
    const done = await client
      .from("legal_pages")
      .update({ body: page.body.replaceAll("[À COMPLÉTER", "[Complété pour les tests") })
      .eq("slug", page.slug);
    if (done.error) throw new Error(done.error.message);
  }
  const { data: offers } = await client.rpc("pass_offers");
  if ((offers ?? []).some((offer) => offer.ends_at === null)) {
    const { data: sessions, error } = await client
      .from("exam_sessions")
      .insert([
        {
          academic_year: "2090-2091",
          label: `Partiels de janvier ${runId}`,
          ends_at: "2091-01-31T22:59:59Z",
        },
        { academic_year: "2090-2091", label: `Partiels de mai ${runId}`, ends_at: "2091-05-31T21:59:59Z" },
      ])
      .select("id");
    if (error) throw new Error(error.message);
    restore.examSessionIds = sessions.map((session) => session.id);
  }
  const { data: plans } = await client.from("plans").select("id, on_sale");
  for (const plan of plans ?? []) {
    if (plan.on_sale) continue;
    restore.plans.push(plan);
    await client.from("plans").update({ on_sale: true }).eq("id", plan.id);
  }

  // Parrainage ouvert, aux conditions par défaut.
  const { data: settings, error: settingsError } = await client
    .from("settings")
    .select("referral_enabled, referral_discount_cents, referral_bonus_days, referral_max_per_year")
    .single();
  if (settingsError) throw new Error(settingsError.message);
  restore.settings = settings;
  const referral = await client
    .from("settings")
    .update({
      referral_enabled: true,
      referral_discount_cents: 200,
      referral_bonus_days: 7,
      referral_max_per_year: 10,
    })
    .eq("id", true);
  if (referral.error) throw new Error(referral.error.message);

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
    salesContent,
    demoQuestionIds,
    courseChapterSlug,
    growthContent,
    exams,
    createdSubjects,
    restore,
  };
  mkdirSync("tests/e2e/.auth", { recursive: true });
  writeFileSync(RUN_FILE, JSON.stringify(data));
}
