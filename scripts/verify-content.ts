/**
 * Vérifie que la base contient exactement le fichier : mêmes chapitres, même ordre des
 * questions dans chaque niveau, mêmes énoncés, options, indices et explications.
 *
 *   npm run content:verify -- content/questions.json
 */
import { isDeepStrictEqual } from "node:util";
import { createServiceClient, parseArgs } from "./lib/service-client";
import { loadContentFile } from "./lib/load-content";
import { countQuestions } from "../src/lib/content/payload";

async function main() {
  const { files } = parseArgs(process.argv.slice(2));
  if (files.length === 0) {
    console.error("Usage : npm run content:verify -- <fichier.json>");
    process.exit(2);
  }
  const client = createServiceClient();
  let failures = 0;

  for (const file of files) {
    const { payload } = loadContentFile(file);
    const problems: string[] = [];

    const { data: subject, error: subjectError } = await client
      .from("subjects")
      .select("id, title")
      .eq("slug", payload.subject.slug)
      .maybeSingle();
    if (subjectError) throw new Error(subjectError.message);
    if (!subject) {
      console.error(`${file} : matière « ${payload.subject.slug} » absente de la base.`);
      failures++;
      continue;
    }

    const { data: chapters, error: chaptersError } = await client
      .from("chapters")
      .select("id, slug, number, label, title, summary, default_decor, position")
      .eq("subject_id", subject.id)
      .order("position");
    if (chaptersError) throw new Error(chaptersError.message);

    const { data: questions, error: questionsError } = await client
      .from("questions")
      .select(
        "id, chapter_id, level, position, course_order, type, decor, prompt, options, correct_option, hint, explanation",
      )
      .in(
        "chapter_id",
        chapters.map((chapter) => chapter.id),
      )
      .is("retired_at", null)
      .order("position");
    if (questionsError) throw new Error(questionsError.message);

    for (const expected of payload.chapters) {
      const chapter = chapters.find((row) => row.slug === expected.slug);
      if (!chapter) {
        problems.push(`chapitre absent : ${expected.slug}`);
        continue;
      }
      for (const key of ["number", "label", "title", "summary", "default_decor", "position"] as const) {
        if (chapter[key] !== expected[key]) problems.push(`${expected.slug} : ${key} différent`);
      }
      for (const level of ["facile", "intermediaire", "confirme"] as const) {
        const want = expected.questions.filter((question) => question.level === level);
        const got = questions.filter((row) => row.chapter_id === chapter.id && row.level === level);
        const wantIds = want.map((question) => question.id).join(",");
        const gotIds = got.map((row) => row.id).join(",");
        if (wantIds !== gotIds) {
          problems.push(
            `${expected.slug}/${level} : ordre ou liste différents\n    fichier : ${wantIds}\n    base    : ${gotIds}`,
          );
          continue;
        }
        want.forEach((question, index) => {
          const row = got[index];
          const comparable = {
            position: index,
            course_order: question.course_order,
            type: question.type,
            decor: question.decor,
            prompt: question.prompt,
            options: question.options,
            correct_option: question.correct_option,
            hint: question.hint,
            explanation: question.explanation,
          };
          const stored = {
            position: row.position,
            course_order: row.course_order,
            type: row.type,
            decor: row.decor,
            prompt: row.prompt,
            options: row.options,
            correct_option: row.correct_option,
            hint: row.hint,
            explanation: row.explanation,
          };
          for (const key of Object.keys(comparable) as (keyof typeof comparable)[]) {
            if (!isDeepStrictEqual(comparable[key], stored[key]))
              problems.push(`${question.id} : ${key} différent`);
          }
        });
      }
    }

    if (problems.length) {
      failures++;
      console.error(`${file} : ${problems.length} écart(s)`);
      for (const problem of problems) console.error(`  - ${problem}`);
    } else {
      console.log(
        `${file} : conforme. ${countQuestions(payload)} questions identiques au fichier ` +
          "(ordre, énoncés, options, bonnes réponses, indices et explications).",
      );
    }
  }
  process.exit(failures ? 1 : 0);
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
