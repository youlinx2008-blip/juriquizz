"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { submitExamAction } from "@/app/actions/exams";
import { formatClock, spokenRemaining } from "@/lib/exam-format";

export type RunnerQuestion = {
  id: string;
  type: "qcm" | "vrai_faux" | "cas_pratique";
  prompt: string;
  options: { id: string; text: string }[];
};

type Props = {
  attemptId: string;
  title: string;
  deadline: string;
  /** Heure du serveur au rendu : le chronomètre suit l'horloge de la base, pas celle de l'appareil. */
  serverNow: number;
  questions: RunnerQuestion[];
  resultHref: string;
};

// Brouillon de copie gardé dans le navigateur (rechargement, coupure de réseau).
const draftKey = (attemptId: string) => `jq-examen-${attemptId}`;
const listeners = new Set<() => void>();

function readDraft(attemptId: string): string {
  try {
    return localStorage.getItem(draftKey(attemptId)) ?? "{}";
  } catch {
    return "{}";
  }
}

function writeDraft(attemptId: string, answers: Record<string, string>) {
  try {
    localStorage.setItem(draftKey(attemptId), JSON.stringify(answers));
  } catch {
    // Stockage indisponible (navigation privée) : la copie reste en mémoire.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function keyLabel(question: RunnerQuestion, index: number): string {
  return question.type === "vrai_faux"
    ? (question.options[index]?.id ?? "").toUpperCase()
    : "ABCDEF".charAt(index);
}

function optionFromKey(question: RunnerQuestion, key: string): string | null {
  const k = key.toLowerCase();
  if (question.type === "vrai_faux" && (k === "v" || k === "f")) {
    return question.options.find((option) => option.id === k)?.id ?? null;
  }
  const index = /^[1-6]$/.test(k) ? Number(k) - 1 : "abcdef".indexOf(k);
  return index >= 0 ? (question.options[index]?.id ?? null) : null;
}

/**
 * Épreuve chronométrée : une question à la fois, navigation libre, aucune correction avant la fin.
 * À l'heure dite, la copie part d'elle-même.
 */
export function ExamRunner({ attemptId, title, deadline, serverNow, questions, resultHref }: Props) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readDraft(attemptId),
    () => "{}",
  );
  const answers = JSON.parse(raw) as Record<string, string>;
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(Date.parse(deadline) - serverNow);
  const [announcement, setAnnouncement] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submitted = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const question = questions[index];
  const answeredCount = questions.filter((item) => answers[item.id]).length;
  const unanswered = questions.length - answeredCount;

  function submit() {
    if (submitted.current) return;
    submitted.current = true;
    setError(null);
    startTransition(async () => {
      const result = await submitExamAction(attemptId, JSON.parse(readDraft(attemptId)), resultHref);
      if (result && !result.ok) {
        submitted.current = false;
        setError(result.message);
      }
    });
  }

  // Chronomètre : décalage avec l'horloge du serveur mesuré une fois, puis mise à jour chaque seconde.
  const onTimeUp = useEffectEvent(() => submit());
  useEffect(() => {
    const skew = serverNow - Date.now();
    const end = Date.parse(deadline);
    let warned5 = end - serverNow <= 5 * 60_000;
    let warned1 = end - serverNow <= 60_000;
    const timer = window.setInterval(() => {
      const left = end - (Date.now() + skew);
      setRemaining(left);
      if (!warned5 && left <= 5 * 60_000) {
        warned5 = true;
        setAnnouncement("Plus que 5 minutes.");
      }
      if (!warned1 && left <= 60_000) {
        warned1 = true;
        setAnnouncement("Plus qu’une minute : la copie sera rendue automatiquement.");
      }
      if (left <= 0) {
        window.clearInterval(timer);
        setAnnouncement("Temps écoulé : la copie est rendue.");
        onTimeUp();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline, serverNow]);

  // Nouvelle question : le titre prend le focus (lecteurs d'écran, clavier).
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [index]);

  const low = remaining <= 5 * 60_000;
  // Temps écoulé ou copie en route : les réponses sont figées.
  const frozen = remaining <= 0 || pending;
  const last = index + 1 >= questions.length;

  function choose(optionId: string) {
    writeDraft(attemptId, { ...JSON.parse(readDraft(attemptId)), [question.id]: optionId });
  }

  // Raccourcis : A à D ou 1 à 4, V et F pour les vrai/faux.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable]")) return;
    const optionId = optionFromKey(question, event.key);
    if (optionId && !frozen) {
      event.preventDefault();
      choose(optionId);
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  return (
    <section className="paper pad exam" aria-labelledby="examen-question">
      <div className="exam-head">
        <p className="course" style={{ margin: 0 }}>
          {title}
        </p>
        <p
          className={`timer${low ? " low" : ""}`}
          role="timer"
          aria-label={`Temps restant : ${spokenRemaining(remaining)}`}
        >
          {formatClock(remaining)}
        </p>
      </div>
      <p className="visually-hidden" aria-live="assertive">
        {announcement}
      </p>
      <nav className="exam-grid" aria-label="Questions de l’épreuve">
        {questions.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={`exam-cell${answers[item.id] ? " answered" : ""}`}
            aria-current={i === index ? "step" : undefined}
            aria-label={`Question ${i + 1}${answers[item.id] ? ", répondue" : ", sans réponse"}`}
            onClick={() => setIndex(i)}
          >
            {i + 1}
          </button>
        ))}
      </nav>
      <p className="exam-count">
        Question {index + 1} sur {questions.length} · {answeredCount} répondue{answeredCount > 1 ? "s" : ""}
      </p>
      <h2 className="q" id="examen-question" tabIndex={-1} ref={titleRef}>
        {question.prompt}
      </h2>
      <div className="opts" role="group" aria-labelledby="examen-question">
        {question.options.map((option, i) => {
          const chosen = answers[question.id] === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`opt${chosen ? " chosen" : ""}`}
              aria-pressed={chosen}
              data-option={option.id}
              disabled={frozen}
              onClick={() => choose(option.id)}
            >
              <span className="key" aria-hidden="true">
                {keyLabel(question, i)}
              </span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>
      <div className="actions">
        <button className="btn" type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Question précédente
        </button>
        {!last && (
          <button className="btn primary" type="button" onClick={() => setIndex(index + 1)}>
            Question suivante
          </button>
        )}
        <button
          className={last ? "btn primary" : "btn"}
          type="button"
          disabled={pending}
          onClick={() => (unanswered > 0 ? setConfirming(true) : submit())}
        >
          {pending ? "Envoi de la copie…" : "Rendre ma copie"}
        </button>
      </div>
      {confirming && !pending && (
        <div className="notice warn exam-confirm" role="alertdialog" aria-labelledby="examen-confirmation">
          <p id="examen-confirmation" style={{ margin: 0 }}>
            Il reste {unanswered} question{unanswered > 1 ? "s" : ""} sans réponse. Rendre la copie quand même
            ?
          </p>
          <div className="actions" style={{ marginBottom: 0 }}>
            <button className="btn primary small" type="button" onClick={submit}>
              Rendre ma copie
            </button>
            <button className="btn small" type="button" onClick={() => setConfirming(false)}>
              Continuer l’épreuve
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="notice bad" role="alert">
          {error}{" "}
          <button className="btn small" type="button" onClick={submit}>
            Renvoyer la copie
          </button>
        </p>
      )}
      <p className="keys-help">
        Clavier :{" "}
        {question.type === "vrai_faux" ? "V ou F" : `A à ${"ABCDEF".charAt(question.options.length - 1)}`}, ou
        1 à {question.options.length}. Aucune correction avant la fin : tu peux revenir sur une question tant
        que le temps n’est pas écoulé.
      </p>
    </section>
  );
}
