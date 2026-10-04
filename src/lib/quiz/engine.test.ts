import { describe, expect, it } from "vitest";
import {
  hasPassed,
  optionForKey,
  optionKeyLabel,
  quizReducer,
  scoreOf,
  startQuiz,
  wrongQuestions,
  type QuizQuestion,
} from "./engine";
import { openErrors, summarizeAttempts } from "./progress";

function qcm(id: string, correct: string): QuizQuestion {
  return {
    id,
    type: "qcm",
    decor: null,
    prompt: `Question ${id}`,
    options: ["a", "b", "c", "d"].map((o) => ({ id: o, text: o.toUpperCase() })),
    correctOption: correct,
    hint: null,
    explanation: ["Parce que."],
    reviewStatus: "a_relire",
  };
}

const vf: QuizQuestion = {
  ...qcm("vf", "f"),
  type: "vrai_faux",
  options: [
    { id: "v", text: "Vrai" },
    { id: "f", text: "Faux" },
  ],
};

function play(questions: QuizQuestion[], choices: string[]) {
  let state = startQuiz(questions);
  for (const choice of choices) {
    state = quizReducer(state, { type: "answer", optionId: choice });
    state = quizReducer(state, { type: "next" });
  }
  return state;
}

describe("moteur de quiz", () => {
  const questions = [qcm("q1", "a"), qcm("q2", "c"), vf];

  it("enchaîne question, correction, question suivante puis résultats", () => {
    let state = startQuiz(questions);
    expect(state.phase).toBe("question");
    state = quizReducer(state, { type: "answer", optionId: "b" });
    expect(state.phase).toBe("answered");
    // Une seconde réponse est ignorée une fois la correction affichée.
    expect(quizReducer(state, { type: "answer", optionId: "a" })).toBe(state);
    state = quizReducer(state, { type: "next" });
    expect(state).toMatchObject({ index: 1, phase: "question" });
    state = play(questions, ["a", "c", "f"]);
    expect(state.phase).toBe("results");
  });

  it("ignore une option inexistante et « suivante » avant d'avoir répondu", () => {
    const state = startQuiz(questions);
    expect(quizReducer(state, { type: "answer", optionId: "z" })).toBe(state);
    expect(quizReducer(state, { type: "next" })).toBe(state);
  });

  it("compte le score et liste les erreurs à refaire", () => {
    const state = play(questions, ["a", "b", "v"]);
    expect(scoreOf(state)).toEqual({ score: 1, total: 3 });
    expect(wrongQuestions(state).map((q) => q.id)).toEqual(["q2", "vf"]);
  });

  it("relance une partie sur les seules erreurs", () => {
    const first = play(questions, ["a", "b", "v"]);
    const retry = quizReducer(first, { type: "restart", questions: wrongQuestions(first), retry: true });
    expect(retry).toMatchObject({ index: 0, phase: "question", retry: true, answers: [] });
    expect(retry.questions.map((q) => q.id)).toEqual(["q2", "vf"]);
    const done = play(retry.questions, ["c", "f"]);
    expect(scoreOf(done)).toEqual({ score: 2, total: 2 });
  });

  it("valide un niveau à partir de 70 %", () => {
    expect(hasPassed(7, 10)).toBe(true);
    expect(hasPassed(6, 10)).toBe(false);
    expect(hasPassed(0, 0)).toBe(false);
  });
});

describe("raccourcis clavier", () => {
  it("A à D et 1 à 4 pour un QCM", () => {
    const q = qcm("q", "a");
    expect(optionForKey(q, "A")).toBe("a");
    expect(optionForKey(q, "c")).toBe("c");
    expect(optionForKey(q, "4")).toBe("d");
    expect(optionForKey(q, "e")).toBeNull();
    expect(optionForKey(q, "5")).toBeNull();
    expect(optionForKey(q, "v")).toBeNull();
    expect(optionKeyLabel(q, 2)).toBe("C");
  });

  it("V et F (ou 1 et 2) pour un vrai/faux", () => {
    expect(optionForKey(vf, "v")).toBe("v");
    expect(optionForKey(vf, "F")).toBe("f");
    expect(optionForKey(vf, "1")).toBe("v");
    expect(optionForKey(vf, "2")).toBe("f");
    expect(optionForKey(vf, "a")).toBeNull();
    expect(optionKeyLabel(vf, 0)).toBe("V");
    expect(optionKeyLabel(vf, 1)).toBe("F");
  });
});

describe("progression", () => {
  const rows = [
    {
      chapter_id: "c1",
      level: "facile" as const,
      score: 3,
      total: 7,
      retry: false,
      created_at: "2026-10-01T10:00:00Z",
    },
    {
      chapter_id: "c1",
      level: "facile" as const,
      score: 6,
      total: 7,
      retry: false,
      created_at: "2026-10-02T10:00:00Z",
    },
    {
      chapter_id: "c1",
      level: "facile" as const,
      score: 2,
      total: 2,
      retry: true,
      created_at: "2026-10-02T11:00:00Z",
    },
    {
      chapter_id: "c1",
      level: "facile" as const,
      score: 5,
      total: 7,
      retry: false,
      created_at: "2026-10-03T10:00:00Z",
    },
    {
      chapter_id: "c2",
      level: "confirme" as const,
      score: 1,
      total: 9,
      retry: false,
      created_at: "2026-10-03T10:00:00Z",
    },
  ];

  it("garde le meilleur et le dernier score, sans les parties « erreurs »", () => {
    const summary = summarizeAttempts(rows);
    expect(summary.get("c1:facile")).toEqual({
      attempts: 3,
      best: { score: 6, total: 7 },
      last: { score: 5, total: 7, at: "2026-10-03T10:00:00Z" },
    });
    expect(summary.get("c2:confirme")?.best).toEqual({ score: 1, total: 9 });
    expect(summary.has("c1:intermediaire")).toBe(false);
  });

  it("ne garde comme erreurs que les questions encore visibles et ratées en dernier", () => {
    const errors = openErrors(
      [
        { question_id: "q1", last_correct: false },
        { question_id: "q2", last_correct: true },
        { question_id: "q3", last_correct: false },
      ],
      ["q1", "q2"],
    );
    expect([...errors]).toEqual(["q1"]);
  });
});
