import type { DecorKey } from "@/lib/decors/registry";

export type QuestionType = "qcm" | "vrai_faux" | "cas_pratique";
export type ReviewStatus = "a_relire" | "relue" | "a_corriger";

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  decor: DecorKey | null;
  prompt: string;
  /** Dans l'ordre du fichier : ne jamais mélanger (les explications citent les lettres). */
  options: { id: string; text: string }[];
  correctOption: string;
  hint: string | null;
  explanation: string[];
  reviewStatus: ReviewStatus;
};

export type QuizState = {
  questions: QuizQuestion[];
  index: number;
  /** Réponse choisie pour chaque question jouée, dans l'ordre. */
  answers: string[];
  phase: "question" | "answered" | "results";
  /** Partie « Refaire mes erreurs ». */
  retry: boolean;
};

export type QuizAction =
  | { type: "answer"; optionId: string }
  | { type: "next" }
  | { type: "restart"; questions: QuizQuestion[]; retry: boolean };

export function startQuiz(questions: QuizQuestion[], retry = false): QuizState {
  return { questions, index: 0, answers: [], phase: questions.length ? "question" : "results", retry };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "answer": {
      if (state.phase !== "question") return state;
      const question = state.questions[state.index];
      if (!question.options.some((option) => option.id === action.optionId)) return state;
      const answers = state.answers.slice(0, state.index);
      answers[state.index] = action.optionId;
      return { ...state, answers, phase: "answered" };
    }
    case "next": {
      if (state.phase !== "answered") return state;
      const index = state.index + 1;
      if (index >= state.questions.length) return { ...state, phase: "results" };
      return { ...state, index, phase: "question" };
    }
    case "restart":
      return startQuiz(action.questions, action.retry);
  }
}

export function isCorrect(question: QuizQuestion, chosen: string | undefined): boolean {
  return chosen !== undefined && chosen === question.correctOption;
}

export function scoreOf(state: QuizState): { score: number; total: number } {
  const score = state.questions.filter((question, i) => isCorrect(question, state.answers[i])).length;
  return { score, total: state.questions.length };
}

export function wrongQuestions(state: QuizState): QuizQuestion[] {
  return state.questions.filter((question, i) => !isCorrect(question, state.answers[i]));
}

/** Seuil de réussite d'un niveau (utilisé en phase 2 pour débloquer le suivant). */
export const PASS_RATIO = 0.7;

export function hasPassed(score: number, total: number): boolean {
  return total > 0 && score / total >= PASS_RATIO;
}

/** Touche affichée à côté d'une option : V/F pour un vrai/faux, sinon A, B, C… */
export function optionKeyLabel(question: QuizQuestion, index: number): string {
  if (question.type === "vrai_faux") return question.options[index].id === "v" ? "V" : "F";
  return "ABCDEF".charAt(index);
}

/**
 * Raccourcis clavier : A à D ou 1 à 4 ; V et F (ou 1 et 2) pour un vrai/faux.
 * Renvoie l'identifiant de l'option, ou null si la touche ne correspond à rien.
 */
export function optionForKey(question: QuizQuestion, key: string): string | null {
  const k = key.toLowerCase();
  if (question.type === "vrai_faux") {
    if (k === "v" || k === "1") return question.options.find((o) => o.id === "v")?.id ?? null;
    if (k === "f" || k === "2") return question.options.find((o) => o.id === "f")?.id ?? null;
    return null;
  }
  let index = "abcdef".indexOf(k);
  if (index < 0) index = ["1", "2", "3", "4", "5", "6"].indexOf(k);
  if (index < 0 || index >= question.options.length) return null;
  return question.options[index].id;
}
