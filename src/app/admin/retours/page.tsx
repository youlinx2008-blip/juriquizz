import type { Metadata } from "next";
import Link from "next/link";
import { resolveFeedbackAction } from "@/app/actions/admin";
import { SceneSetter } from "@/components/scene-setter";
import { formatDayTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Retours" };

const RATING_LABELS: Record<string, string> = {
  claire: "Claire",
  pas_claire: "Pas claire",
  erreur: "Erreur signalée",
};

export default async function AdminFeedbackPage({ searchParams }: PageProps<"/admin/retours">) {
  const { vue } = await searchParams;
  const showAll = vue === "tous";
  const supabase = await createClient();
  let query = supabase
    .from("feedback")
    .select("id, user_id, question_id, rating, comment, resolved_at, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (!showAll) query = query.neq("rating", "claire").is("resolved_at", null);
  const { data: feedback, error } = await query;
  if (error) throw new Error(error.message);
  const userIds = [...new Set((feedback ?? []).map((item) => item.user_id))];
  const questionIds = [...new Set((feedback ?? []).map((item) => item.question_id))];
  const [{ data: profiles }, { data: questions }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    questionIds.length
      ? supabase.from("questions").select("id, prompt").in("id", questionIds)
      : Promise.resolve({ data: [] as { id: string; prompt: string }[] }),
  ]);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const prompts = new Map((questions ?? []).map((question) => [question.id, question.prompt]));

  return (
    <>
      <SceneSetter decor="chateau" />
      <section className="paper pad">
        <h1 className="title small">Retours sur les questions</h1>
        <div className="tabs">
          <Link
            className="chip"
            href="/admin/retours"
            aria-current={showAll ? undefined : "page"}
            aria-pressed={!showAll}
          >
            À traiter
          </Link>
          <Link
            className="chip"
            href="/admin/retours?vue=tous"
            aria-current={showAll ? "page" : undefined}
            aria-pressed={showAll}
          >
            Tous
          </Link>
        </div>
        {(feedback ?? []).length === 0 && <p>Aucun retour {showAll ? "" : "à traiter"}.</p>}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
          {(feedback ?? []).map((item) => (
            <li key={item.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <strong>{RATING_LABELS[item.rating]}</strong>{" "}
              <span style={{ color: "var(--ink2)" }}>
                · {names.get(item.user_id) || "anonyme"} · {formatDayTime(item.created_at)}
                {item.resolved_at ? " · traité" : ""}
              </span>
              <div>
                <Link href={`/admin/questions/${item.question_id}`}>{item.question_id}</Link>
                <span style={{ color: "var(--ink2)" }}>
                  {" "}
                  : {(prompts.get(item.question_id) ?? "").slice(0, 120)}
                </span>
              </div>
              {item.comment && <p style={{ margin: "6px 0" }}>{item.comment}</p>}
              {item.rating !== "claire" && (
                <form action={resolveFeedbackAction}>
                  <input type="hidden" name="feedbackId" value={item.id} />
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
