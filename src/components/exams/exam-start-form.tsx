"use client";

import { useActionState } from "react";
import { startExamAction, type ExamStartState } from "@/app/actions/exams";

export function ExamStartForm({ examId, back, label }: { examId: string; back: string; label: string }) {
  const [state, action, pending] = useActionState<ExamStartState, FormData>(startExamAction, {
    status: "idle",
  });
  return (
    <form action={action}>
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="back" value={back} />
      {state.status === "error" && (
        <p className="notice bad" role="alert" style={{ marginBottom: 12 }}>
          {state.message}
        </p>
      )}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Préparation de l’épreuve…" : label}
      </button>
    </form>
  );
}
