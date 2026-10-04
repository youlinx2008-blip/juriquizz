"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { submitExamAction } from "@/app/actions/exams";

/**
 * Épreuve dont le temps s'est écoulé page fermée : la copie gardée dans ce navigateur (s'il y en a
 * une) est rendue telle quelle, et la base la signale « hors délai ».
 */
export function ExamLateSubmit({ attemptId, resultHref }: { attemptId: string; resultHref: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sent = useRef(false);

  function send() {
    startTransition(async () => {
      let answers: Record<string, string> = {};
      try {
        answers = JSON.parse(localStorage.getItem(`jq-examen-${attemptId}`) ?? "{}");
      } catch {
        // Pas de brouillon lisible : copie blanche.
      }
      const result = await submitExamAction(attemptId, answers, resultHref);
      if (result && !result.ok) setError(result.message);
    });
  }

  const sendOnce = useEffectEvent(() => {
    if (sent.current) return;
    sent.current = true;
    send();
  });
  useEffect(() => {
    sendOnce();
  }, []);

  return (
    <section className="paper pad" aria-live="polite">
      <h1 className="title small">Temps écoulé</h1>
      <p className="lead">
        Le temps de ta dernière épreuve s&rsquo;est écoulé pendant que la page était fermée. Les réponses
        gardées dans ce navigateur sont rendues telles quelles ; la copie sera marquée « rendue hors délai ».
      </p>
      {error ? (
        <p className="notice bad" role="alert">
          {error}{" "}
          <button
            className="btn small"
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              send();
            }}
          >
            Renvoyer la copie
          </button>
        </p>
      ) : (
        <p className="notice">{pending ? "Envoi de la copie…" : "Copie envoyée."}</p>
      )}
    </section>
  );
}
