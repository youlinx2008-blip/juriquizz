import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveFeedbackAction } from "@/app/actions/admin";
import { setQuestionDemoAction } from "@/app/actions/admin-vente";
import { REVIEW_LABELS, ReviewStatusForm } from "@/components/admin/review-status-form";
import { SceneSetter } from "@/components/scene-setter";
import { formatDayTime } from "@/lib/dates";
import { isDecorKey } from "@/lib/decors/registry";
import { isLevelId, levelInfo } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Question" };

const RATING_LABELS: Record<string, string> = {
  claire: "Claire",
  pas_claire: "Pas claire",
  erreur: "Erreur signalée",
};

export default async function AdminQuestionPage({ params }: PageProps<"/admin/questions/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: question, error } = await supabase
    .from("questions")
    .select(
      "id, chapter_id, level, position, type, decor, prompt, options, correct_option, hint, explanation, review_status, reviewed_at, retired_at, demo",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!question) notFound();

  const [{ data: chapter }, { data: optionStats }, { data: feedback }] = await Promise.all([
    supabase.from("chapters").select("label, title, default_decor").eq("id", question.chapter_id).single(),
    supabase.rpc("admin_option_stats", { p_question_id: id }),
    supabase
      .from("feedback")
      .select("id, user_id, rating, comment, resolved_at, created_at")
      .eq("question_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const userIds = [...new Set((feedback ?? []).map((item) => item.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as { id: string; display_name: string }[] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const counts = new Map((optionStats ?? []).map((row) => [row.option_id, row.chosen_count]));
  const totalAnswers = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const options = question.options as { id: string; text: string }[];
  const explanation = question.explanation as string[];
  const decor = isDecorKey(question.decor)
    ? question.decor
    : isDecorKey(chapter?.default_decor)
      ? chapter.default_decor
      : "chateau";

  return (
    <>
      <SceneSetter decor={decor} />
      <section className="paper pad">
        <p className="course">
          <Link href="/admin/questions">Questions</Link> · {chapter?.label},{" "}
          {isLevelId(question.level) ? levelInfo(question.level).label : question.level}, n°
          {question.position + 1} · {question.id}
        </p>
        <h1 className="q" style={{ fontSize: "1.25rem", margin: "8px 0 14px" }}>
          {question.prompt}
        </h1>
        {question.retired_at && (
          <p className="notice warn">Question retirée du fichier : invisible pour les étudiants.</p>
        )}
        <p>
          Statut :{" "}
          <span className={`pill ${question.review_status}`}>{REVIEW_LABELS[question.review_status]}</span>
          {question.reviewed_at && (
            <span style={{ color: "var(--ink2)" }}> (modifié le {formatDayTime(question.reviewed_at)})</span>
          )}
        </p>
        <ReviewStatusForm questionId={question.id} status={question.review_status} />
        <form action={setQuestionDemoAction} className="inline-form" style={{ marginTop: 12 }}>
          <input type="hidden" name="questionId" value={question.id} />
          <input type="hidden" name="demo" value={question.demo ? "false" : "true"} />
          <span>
            {question.demo
              ? "Dans le mini-quiz de démonstration (si relue)."
              : "Pas dans le mini-quiz de démonstration."}
          </span>
          <button className="btn small" type="submit">
            {question.demo ? "Retirer de la démo" : "Ajouter à la démo"}
          </button>
        </form>

        <h2 style={{ fontSize: "1.05rem", marginTop: 22 }}>
          Réponses choisies ({totalAnswers}, premières tentatives)
        </h2>
        <div className="table-wrap">
          <table className="data">
            <tbody>
              {options.map((option, index) => {
                const n = counts.get(option.id) ?? 0;
                const share = totalAnswers ? Math.round((n / totalAnswers) * 100) : 0;
                return (
                  <tr key={option.id}>
                    <td style={{ width: 30, fontWeight: 700 }}>
                      {question.type === "vrai_faux" ? option.id.toUpperCase() : "ABCDEF".charAt(index)}
                    </td>
                    <td>
                      {option.text}
                      {option.id === question.correct_option && (
                        <strong style={{ color: "var(--good)" }}> (bonne réponse)</strong>
                      )}
                    </td>
                    <td className="num-cell" style={{ width: 160 }}>
                      <div className="bar-h" aria-hidden="true">
                        <i style={{ width: `${share}%` }} />
                      </div>
                      {n} ({share} %)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {question.hint && (
          <>
            <h2 style={{ fontSize: "1.05rem", marginTop: 22 }}>Indice</h2>
            <p className="hint">{question.hint}</p>
          </>
        )}
        <h2 style={{ fontSize: "1.05rem", marginTop: 22 }}>Explication</h2>
        <div className="exp" style={{ borderTop: 0, paddingTop: 0 }}>
          {explanation.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="paper pad" aria-labelledby="retours-question">
        <h2 id="retours-question" style={{ marginTop: 0 }}>
          Retours ({feedback?.length ?? 0})
        </h2>
        {(feedback ?? []).length === 0 && <p>Aucun retour pour cette question.</p>}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
          {(feedback ?? []).map((item) => (
            <li key={item.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <strong>{RATING_LABELS[item.rating]}</strong>{" "}
              <span style={{ color: "var(--ink2)" }}>
                · {names.get(item.user_id) || "anonyme"} · {formatDayTime(item.created_at)}
                {item.resolved_at ? " · traité" : ""}
              </span>
              {item.comment && <p style={{ margin: "6px 0" }}>{item.comment}</p>}
              {item.rating !== "claire" && (
                <form action={resolveFeedbackAction}>
                  <input type="hidden" name="feedbackId" value={item.id} />
                  <input type="hidden" name="questionId" value={question.id} />
                  <input type="hidden" name="resolved" value={item.resolved_at ? "false" : "true"} />
                  <button className="btn small" type="submit">
                    {item.resolved_at ? "Rouvrir" : "Marquer comme traité"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
