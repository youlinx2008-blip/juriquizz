import type { Metadata } from "next";
import Link from "next/link";
import { setQuestionDemoAction } from "@/app/actions/admin-vente";
import { REVIEW_LABELS, ReviewStatusForm } from "@/components/admin/review-status-form";
import { SceneSetter } from "@/components/scene-setter";
import { getSubjects } from "@/lib/data/catalog";
import { LEVELS, levelInfo, isLevelId } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Questions" };

function rate(correct: number, answers: number): number | null {
  return answers ? Math.round((correct / answers) * 100) : null;
}

export default async function AdminQuestionsPage({ searchParams }: PageProps<"/admin/questions">) {
  const params = await searchParams;
  const str = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");
  const subjectFilter = str(params.matiere);
  const chapterFilter = str(params.chapitre);
  const levelFilter = str(params.niveau);
  const statusFilter = str(params.statut);
  const demoFilter = str(params.demo);
  const sort = str(params.tri) || "cours";

  const supabase = await createClient();
  const subjects = await getSubjects(supabase);
  const { data, error } = await supabase.rpc(
    "admin_question_stats",
    subjectFilter ? { p_subject_id: subjectFilter } : {},
  );
  if (error) throw new Error(error.message);

  let rows = (data ?? []).filter((row) => !row.retired);
  if (chapterFilter) rows = rows.filter((row) => row.chapter_id === chapterFilter);
  if (levelFilter) rows = rows.filter((row) => row.level === levelFilter);
  if (statusFilter) rows = rows.filter((row) => row.review_status === statusFilter);
  if (demoFilter === "1") rows = rows.filter((row) => row.demo);
  const demoCount = (data ?? []).filter(
    (row) => row.demo && !row.retired && row.review_status === "relue",
  ).length;
  if (sort === "reussite") {
    rows = [...rows].sort(
      (a, b) =>
        (rate(a.correct_count, a.answers_count) ?? 101) - (rate(b.correct_count, b.answers_count) ?? 101),
    );
  } else if (sort === "retours") {
    rows = [...rows].sort(
      (a, b) => b.feedback_pas_claire + b.feedback_erreur - (a.feedback_pas_claire + a.feedback_erreur),
    );
  }
  const chapters = subjects.flatMap((subject) =>
    subject.chapters.map((chapter) => ({ ...chapter, subjectTitle: subject.title })),
  );

  return (
    <>
      <SceneSetter decor="chateau" />
      <section className="paper pad">
        <h1 className="title small">Questions</h1>
        <p className="lead" style={{ marginBottom: 14 }}>
          Taux de réussite calculé sur les premières tentatives (les parties « Refaire mes erreurs » ne
          comptent pas). Un taux bas ou des retours « pas claire » signalent souvent un énoncé à reprendre.
        </p>
        <form className="filters" method="get">
          <div className="field">
            <label htmlFor="matiere">Matière</label>
            <select id="matiere" name="matiere" defaultValue={subjectFilter}>
              <option value="">Toutes</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="chapitre">Chapitre</label>
            <select id="chapitre" name="chapitre" defaultValue={chapterFilter}>
              <option value="">Tous</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.label} : {chapter.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="niveau">Niveau</label>
            <select id="niveau" name="niveau" defaultValue={levelFilter}>
              <option value="">Tous</option>
              {LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="statut">Statut</label>
            <select id="statut" name="statut" defaultValue={statusFilter}>
              <option value="">Tous</option>
              {Object.entries(REVIEW_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="demo">Démonstration</label>
            <select id="demo" name="demo" defaultValue={demoFilter}>
              <option value="">Toutes les questions</option>
              <option value="1">Questions de la démo</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="tri">Tri</label>
            <select id="tri" name="tri" defaultValue={sort}>
              <option value="cours">Ordre du cours</option>
              <option value="reussite">Taux de réussite croissant</option>
              <option value="retours">Retours négatifs d&rsquo;abord</option>
            </select>
          </div>
          <button className="btn" type="submit">
            Filtrer
          </button>
        </form>
        <p style={{ color: "var(--ink2)", fontSize: "0.9rem" }}>
          {rows.length} question(s). Mini-quiz de démonstration : {demoCount} question(s) relue(s) ; seules
          les questions relues y figurent, et elles sont visibles de tout compte, même sans pass.
        </p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col">Chapitre, niveau</th>
                <th scope="col">Réponses</th>
                <th scope="col">Réussite</th>
                <th scope="col">Retours</th>
                <th scope="col">Statut</th>
                <th scope="col">Démo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const r = rate(row.correct_count, row.answers_count);
                return (
                  <tr key={row.question_id}>
                    <td style={{ maxWidth: 420 }}>
                      <Link href={`/admin/questions/${row.question_id}`}>{row.question_id}</Link>
                      <div style={{ color: "var(--ink2)" }}>
                        {row.prompt.length > 140 ? `${row.prompt.slice(0, 140)}…` : row.prompt}
                      </div>
                    </td>
                    <td>
                      {row.chapter_label}, {isLevelId(row.level) ? levelInfo(row.level).label : row.level}
                    </td>
                    <td className="num-cell">
                      {row.answers_count}
                      <div style={{ color: "var(--ink2)" }}>{row.users_count} pers.</div>
                    </td>
                    <td className="num-cell">
                      {r === null ? "–" : <span className={r < 40 ? "rate-low" : undefined}>{r} %</span>}
                    </td>
                    <td className="num-cell">
                      {row.feedback_pas_claire + row.feedback_erreur > 0 ? (
                        <>
                          {row.feedback_pas_claire} pas claire, {row.feedback_erreur} erreur
                          {row.feedback_open > 0 && (
                            <div className="rate-low">{row.feedback_open} à traiter</div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "var(--ink2)" }}>
                          {row.feedback_claire ? `${row.feedback_claire} claire` : "–"}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`pill ${row.review_status}`}>{REVIEW_LABELS[row.review_status]}</span>
                      <div style={{ marginTop: 6 }}>
                        <ReviewStatusForm questionId={row.question_id} status={row.review_status} />
                      </div>
                    </td>
                    <td>
                      <form action={setQuestionDemoAction}>
                        <input type="hidden" name="questionId" value={row.question_id} />
                        <input type="hidden" name="demo" value={row.demo ? "false" : "true"} />
                        <button
                          className={row.demo ? "btn small primary" : "btn small"}
                          type="submit"
                          aria-pressed={row.demo}
                        >
                          Démo<span className="visually-hidden"> : {row.question_id}</span>
                        </button>
                      </form>
                      {row.demo && row.review_status !== "relue" && (
                        <div className="rate-low" style={{ marginTop: 4 }}>
                          pas encore relue
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
