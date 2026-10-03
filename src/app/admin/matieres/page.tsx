import type { Metadata } from "next";
import { setSubjectVisibilityAction } from "@/app/actions/admin";
import { SceneSetter } from "@/components/scene-setter";
import { countByChapterLevel, getSubjects, getVisibleQuestionRefs } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Matières" };

export default async function AdminSubjectsPage() {
  const supabase = await createClient();
  const [subjects, refs] = await Promise.all([getSubjects(supabase), getVisibleQuestionRefs(supabase)]);
  const counts = countByChapterLevel(refs);
  return (
    <>
      <SceneSetter decor="chateau" />
      <section className="paper pad">
        <h1 className="title small">Matières</h1>
        <p className="lead">
          Droit de retrait : une matière masquée disparaît immédiatement pour tous les étudiants (catalogue,
          quiz, aperçu de l&rsquo;accueil). Les scores déjà enregistrés sont conservés.
        </p>
      </section>
      {subjects.map((subject) => {
        const total = subject.chapters.reduce(
          (sum, chapter) =>
            sum +
            ["facile", "intermediaire", "confirme"].reduce(
              (s, level) => s + (counts.get(`${chapter.id}:${level}`) ?? 0),
              0,
            ),
          0,
        );
        return (
          <section className="paper pad" key={subject.id} aria-labelledby={`admin-matiere-${subject.slug}`}>
            <h2
              id={`admin-matiere-${subject.slug}`}
              style={{ margin: "0 0 6px", fontFamily: "var(--serif)" }}
            >
              {subject.title}
            </h2>
            <p style={{ margin: "0 0 12px" }}>
              <span className={`pill ${subject.visible ? "relue" : "a_corriger"}`}>
                {subject.visible ? "Visible" : "Masquée"}
              </span>{" "}
              <span style={{ color: "var(--ink2)" }}>
                {subject.chapters.length} chapitre(s), {total} question(s)
              </span>
            </p>
            <form action={setSubjectVisibilityAction}>
              <input type="hidden" name="subjectId" value={subject.id} />
              <input type="hidden" name="visible" value={subject.visible ? "false" : "true"} />
              <button className={subject.visible ? "btn danger" : "btn primary"} type="submit">
                {subject.visible ? "Masquer cette matière" : "Rendre visible"}
              </button>
            </form>
          </section>
        );
      })}
    </>
  );
}
