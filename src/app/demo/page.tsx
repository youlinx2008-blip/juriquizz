import type { Metadata } from "next";
import Link from "next/link";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { SceneSetter } from "@/components/scene-setter";
import { requireViewer } from "@/lib/auth";
import { getDemoQuestions } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mini-quiz de démonstration" };

/** Quelques questions relues, ouvertes à tout compte, pour essayer JuriQuizz avant d'acheter un pass. */
export default async function DemoPage() {
  const viewer = await requireViewer("/demo");
  const questions = await getDemoQuestions(await createClient());
  const exitHref = viewer.hasAccess ? "/cours" : "/acces";

  if (questions.length === 0) {
    return (
      <>
        <SceneSetter decor="codex" />
        <section className="paper pad">
          <p className="course">Démonstration</p>
          <h1 className="title small">Mini-quiz bientôt disponible</h1>
          <p className="lead">Les questions de démonstration sont en cours de préparation.</p>
          <div className="actions">
            <Link className="btn primary" href="/tarifs">
              Voir les pass
            </Link>
            <Link className="btn" href={exitHref}>
              Retour
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SceneSetter decor={questions[0].decor ?? "codex"} />
      <h1 className="visually-hidden">Mini-quiz de démonstration</h1>
      <QuizRunner
        userId={viewer.userId}
        chapter={{ id: "demo", label: "Démonstration", title: "Mini-quiz", defaultDecor: "codex" }}
        chapterHref={exitHref}
        level="facile"
        questions={questions}
        startIds={null}
        demo
      />
    </>
  );
}
