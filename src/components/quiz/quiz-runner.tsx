"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { submitAttemptAction, type AttemptInput } from "@/app/actions/quiz";
import { Emblem } from "@/components/emblem";
import { useScene } from "@/components/providers/scene-provider";
import { useSound } from "@/components/providers/sound-provider";
import { DECORS, type DecorKey } from "@/lib/decors/registry";
import { levelInfo, type LevelId } from "@/lib/levels";
import {
  hasPassed,
  isCorrect,
  optionForKey,
  optionKeyLabel,
  quizReducer,
  scoreOf,
  startQuiz,
  wrongQuestions,
  type QuestionType,
  type QuizQuestion,
  type QuizState,
} from "@/lib/quiz/engine";
import { queuePending } from "@/lib/quiz/pending";
import { QuestionFeedback } from "./question-feedback";

const KIND_LABELS: Record<QuestionType, string> = {
  qcm: "QCM",
  vrai_faux: "Vrai ou faux",
  cas_pratique: "Cas pratique",
};

export type QuizChapter = {
  id: string;
  label: string;
  title: string;
  defaultDecor: DecorKey;
};

type Props = {
  userId: string;
  chapter: QuizChapter;
  chapterHref: string;
  level: LevelId;
  /** Toutes les questions du niveau, dans l'ordre du cours. */
  questions: QuizQuestion[];
  /** Questions de départ pour « Refaire mes erreurs » (sinon tout le niveau). */
  startIds: string[] | null;
  /** Mini-quiz de démonstration (comptes sans pass) : rien n'est enregistré. */
  demo?: boolean;
  /** Niveau suivant du chapitre, et s'il était déjà débloqué au début de la partie. */
  next?: { level: LevelId; unlocked: boolean } | null;
};

function prefersReducedMotion(): boolean {
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function QuizRunner({
  userId,
  chapter,
  chapterHref,
  level,
  questions,
  startIds,
  demo = false,
  next = null,
}: Props) {
  const [state, dispatch] = useReducer(quizReducer, null, (): QuizState => {
    if (!startIds) return startQuiz(questions);
    const wanted = new Set(startIds);
    return startQuiz(
      questions.filter((question) => wanted.has(question.id)),
      true,
    );
  });
  const { setDecor } = useScene();
  const { fx } = useSound();
  const question = state.phase === "results" ? null : state.questions[state.index];
  const decor = question?.decor ?? chapter.defaultDecor;

  // Le décor (et l'ambiance sonore) suivent la question.
  useEffect(() => {
    setDecor(decor);
  }, [decor, setDecor]);

  const answer = useCallback(
    (optionId: string) => {
      if (!question || state.phase !== "question") return;
      fx(optionId === question.correctOption ? "good" : "bad");
      dispatch({ type: "answer", optionId });
    },
    [fx, question, state.phase],
  );

  // Raccourcis : A à D ou 1 à 4, V et F pour les vrai/faux.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || !question || state.phase !== "question") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const optionId = optionForKey(question, event.key);
      if (optionId) {
        event.preventDefault();
        answer(optionId);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [answer, question, state.phase]);

  if (state.phase === "results") {
    return (
      <Results
        state={state}
        userId={userId}
        chapter={chapter}
        chapterHref={chapterHref}
        level={level}
        onRestart={(list, retry) => dispatch({ type: "restart", questions: list, retry })}
        allQuestions={questions}
        demo={demo}
        next={next}
      />
    );
  }

  return (
    <QuestionCard
      key={`${state.retry}-${state.index}-${question!.id}`}
      state={state}
      question={question!}
      decor={decor}
      chapter={chapter}
      chapterHref={chapterHref}
      level={level}
      onAnswer={answer}
      onNext={() => dispatch({ type: "next" })}
      demo={demo}
    />
  );
}

function QuestionCard({
  state,
  question,
  decor,
  chapter,
  chapterHref,
  level,
  onAnswer,
  onNext,
  demo,
}: {
  state: QuizState;
  question: QuizQuestion;
  decor: DecorKey;
  chapter: QuizChapter;
  chapterHref: string;
  level: LevelId;
  onAnswer: (optionId: string) => void;
  onNext: () => void;
  demo: boolean;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const answered = state.phase === "answered";
  const chosen = state.answers[state.index];
  const good = answered && isCorrect(question, chosen);
  const total = state.questions.length;
  const last = state.index + 1 >= total;
  const correctText = question.options.find((option) => option.id === question.correctOption)?.text ?? "";

  // Nouvelle question : retour en haut, et le titre de la question reçoit le focus.
  useEffect(() => {
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  // Après la réponse : la correction défile dans la vue, le bouton « suivante » prend le focus.
  useEffect(() => {
    if (!answered) return;
    nextRef.current?.focus({ preventScroll: true });
    feedbackRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }, [answered]);

  return (
    <section className="paper pad hero" aria-labelledby="question-titre">
      <span className="emblem" aria-hidden="true">
        <Emblem decor={decor} />
      </span>
      <div className="qhead">
        <Link className="chip" href={chapterHref}>
          Quitter
        </Link>
        <span className="lvl">
          {demo ? "Démonstration" : `${chapter.label}, ${levelInfo(level).label}`}
          {state.retry ? " (erreurs)" : ""}
        </span>
        <span className="count">
          {state.index + 1} sur {total}
        </span>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-label="Avancement dans le niveau"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={state.index}
      >
        <i style={{ width: `${(state.index / total) * 100}%` }} />
      </div>
      <div className="kinds">
        <span className="kind">{KIND_LABELS[question.type]}</span>
        <span className="kind mood">
          <Emblem decor={decor} />
          {DECORS[decor].label}
        </span>
        {question.reviewStatus === "a_relire" && <span className="kind review">En cours de relecture</span>}
      </div>
      <h2 className="q" id="question-titre" tabIndex={-1} ref={titleRef}>
        {question.prompt}
      </h2>
      <div className="opts" role="group" aria-labelledby="question-titre">
        {question.options.map((option, index) => {
          const isRight = option.id === question.correctOption;
          const isChosen = option.id === chosen;
          const status = !answered ? "" : isRight ? " good" : isChosen ? " bad" : " dim";
          return (
            <button
              key={option.id}
              className={`opt${status}`}
              type="button"
              disabled={answered}
              data-option={option.id}
              onClick={() => onAnswer(option.id)}
            >
              <span className="key" aria-hidden="true">
                {optionKeyLabel(question, index)}
              </span>
              <span>
                {option.text}
                {answered && isRight && <span className="visually-hidden"> (bonne réponse)</span>}
                {answered && isChosen && !isRight && <span className="visually-hidden"> (ta réponse)</span>}
              </span>
            </button>
          );
        })}
      </div>
      {question.hint && !answered && (
        <div className="tools">
          <button
            className="chip"
            type="button"
            aria-expanded={hintOpen}
            aria-controls="indice"
            onClick={() => setHintOpen((open) => !open)}
          >
            {hintOpen ? "Masquer l’indice" : "Voir un indice"}
          </button>
          <p className="hint" id="indice" hidden={!hintOpen}>
            {question.hint}
          </p>
        </div>
      )}
      <div className="fb" aria-live="polite" ref={feedbackRef}>
        {answered && (
          <>
            <div className={`verdict ${good ? "good" : "bad"}`}>
              {good ? "Bonne réponse" : "Pas tout à fait"}
            </div>
            {!good && (
              <p className="right">
                Bonne réponse : <strong>{correctText}</strong>
              </p>
            )}
            <div className="exp">
              {question.explanation.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <button className="btn primary" type="button" ref={nextRef} onClick={onNext}>
              {last ? "Voir mes résultats" : "Question suivante"}
            </button>
          </>
        )}
      </div>
      {answered && <QuestionFeedback questionId={question.id} />}
      {!answered && (
        <p className="keys-help">
          Clavier :{" "}
          {question.type === "vrai_faux" ? "V ou F" : `A à ${"ABCDEF".charAt(question.options.length - 1)}`},
          ou 1 à {question.options.length}.
        </p>
      )}
    </section>
  );
}

type SaveState = "saving" | "saved" | "queued" | "rejected" | "demo";

function Results({
  state,
  userId,
  chapter,
  chapterHref,
  level,
  onRestart,
  allQuestions,
  demo,
  next,
}: {
  state: QuizState;
  userId: string;
  chapter: QuizChapter;
  chapterHref: string;
  level: LevelId;
  onRestart: (questions: QuizQuestion[], retry: boolean) => void;
  allQuestions: QuizQuestion[];
  demo: boolean;
  next: { level: LevelId; unlocked: boolean } | null;
}) {
  const { fx } = useSound();
  const { score, total } = scoreOf(state);
  const wrong = wrongQuestions(state);
  const passed = hasPassed(score, total);
  const [save, setSave] = useState<SaveState>(demo ? "demo" : "saving");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
    if (passed) fx("win");
  }, [fx, passed]);

  // Enregistrement de la partie (une seule fois) ; hors connexion, elle part plus tard.
  useEffect(() => {
    if (submitted.current || demo) return;
    submitted.current = true;
    const input: AttemptInput = {
      chapterId: chapter.id,
      level,
      retry: state.retry,
      answers: state.questions.map((question, index) => ({
        questionId: question.id,
        chosen: state.answers[index],
      })),
    };
    submitAttemptAction(input)
      .then((result) => {
        if (result.ok) setSave("saved");
        else if (result.retryable) {
          queuePending(userId, input);
          setSave("queued");
        } else setSave("rejected");
      })
      .catch(() => {
        queuePending(userId, input);
        setSave("queued");
      });
  }, [chapter.id, demo, level, state, userId]);

  const message = passed
    ? "Niveau réussi : au moins 70 % de bonnes réponses."
    : "Relis les explications ci-dessous, puis retente : c’est en comprenant les pièges qu’on progresse.";
  // Une partie complète réussie ouvre le niveau suivant (une fois la partie enregistrée).
  const opensNext = !demo && !state.retry && passed && next !== null && (save === "saved" || next.unlocked);
  const nextMessage =
    demo || !next || state.retry
      ? null
      : opensNext
        ? next.unlocked
          ? `Niveau suivant : ${levelInfo(next.level).label}.`
          : `Niveau ${levelInfo(next.level).label} débloqué !`
        : next.unlocked
          ? null
          : `Le niveau ${levelInfo(next.level).label} se débloque à partir de 70 % de bonnes réponses.`;

  return (
    <section className="paper pad" aria-labelledby="resultats-titre">
      <p className="course">
        {demo
          ? "Mini-quiz de démonstration"
          : `${chapter.label}, ${chapter.title}, ${levelInfo(level).label}`}
        {state.retry ? " (erreurs)" : ""}
      </p>
      <h2 id="resultats-titre" className="visually-hidden" tabIndex={-1} ref={titleRef}>
        Résultats : {score} sur {total}
      </h2>
      <p className="score" aria-hidden="true">
        {score}
        <small> sur {total}</small>
      </p>
      <p className="msg">{message}</p>
      {nextMessage && <p className="next-level">{nextMessage}</p>}
      <p className={`save-state${save === "rejected" ? " bad" : ""}`} role="status">
        {save === "saving" && "Enregistrement du score…"}
        {save === "saved" && "Score enregistré dans ta progression."}
        {save === "queued" && "Pas de connexion : le score sera enregistré dès le retour du réseau."}
        {save === "rejected" && "Ce score n’a pas pu être enregistré (des questions ont changé entre-temps)."}
        {save === "demo" &&
          "Démonstration : le score n’est pas enregistré. Avec un pass, ta progression est suivie chapitre par chapitre."}
      </p>
      <div className="actions">
        {wrong.length > 0 && (
          <button className="btn primary" type="button" onClick={() => onRestart(wrong, true)}>
            Refaire mes erreurs
          </button>
        )}
        <button
          className={wrong.length ? "btn" : "btn primary"}
          type="button"
          onClick={() => onRestart(allQuestions, false)}
        >
          {demo ? "Rejouer la démonstration" : "Rejouer ce niveau"}
        </button>
        {opensNext && next && (
          <Link className="btn primary" href={`${chapterHref}/${next.level}`}>
            Niveau suivant<span className="visually-hidden"> : {levelInfo(next.level).label}</span>
          </Link>
        )}
        {demo ? (
          <Link className="btn" href="/tarifs">
            Voir les pass
          </Link>
        ) : (
          <>
            <Link className="btn" href={chapterHref}>
              Choisir un autre niveau
            </Link>
            <Link className="btn" href="/cours">
              Tous les chapitres
            </Link>
          </>
        )}
      </div>
      <div className="review">
        <h3 className="levels-title" style={{ paddingLeft: 0, borderTop: 0 }}>
          Revoir les questions
        </h3>
        {state.questions.map((question, index) => {
          const chosenId = state.answers[index];
          const good = isCorrect(question, chosenId);
          const mine = question.options.find((option) => option.id === chosenId);
          const right = question.options.find((option) => option.id === question.correctOption);
          return (
            <details key={question.id}>
              <summary>
                <span className={good ? "ok" : "ko"}>{good ? "Juste" : "Faux"}</span> : {question.prompt}
              </summary>
              <div className="body">
                {!good && <p>Ta réponse : {mine ? mine.text : "aucune"}</p>}
                <p>
                  Bonne réponse : <strong>{right?.text}</strong>
                </p>
                {question.explanation.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
