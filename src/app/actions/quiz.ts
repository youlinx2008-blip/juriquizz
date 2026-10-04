"use server";

import { z } from "zod";
import { LEVEL_IDS } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

const attemptSchema = z.object({
  chapterId: z.uuid(),
  level: z.enum(LEVEL_IDS),
  retry: z.boolean(),
  answers: z
    .array(z.object({ questionId: z.string().min(1).max(120), chosen: z.string().min(1).max(10) }))
    .min(1)
    .max(200),
});

export type AttemptInput = z.infer<typeof attemptSchema>;
export type AttemptResult = { ok: true; score: number; total: number } | { ok: false; retryable: boolean };

/** Enregistre une partie terminée. Le score est recalculé par la base, pas par le navigateur. */
export async function submitAttemptAction(input: AttemptInput): Promise<AttemptResult> {
  const parsed = attemptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, retryable: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_attempt", {
    p_chapter_id: parsed.data.chapterId,
    p_level: parsed.data.level,
    p_retry: parsed.data.retry,
    p_answers: parsed.data.answers.map((answer) => ({
      question_id: answer.questionId,
      chosen: answer.chosen,
    })),
  });
  if (error) {
    // Réponses refusées (question retirée entre-temps…) : inutile de réessayer.
    return { ok: false, retryable: error.code !== "22023" && error.code !== "42501" };
  }
  const result = data as { score: number; total: number };
  return { ok: true, score: result.score, total: result.total };
}

const feedbackSchema = z.object({
  questionId: z.string().min(1).max(120),
  rating: z.enum(["claire", "pas_claire", "erreur"]),
  comment: z.string().trim().max(2000).default(""),
});

export type FeedbackInput = z.input<typeof feedbackSchema>;

/** « Cette question est-elle claire ? » */
export async function sendFeedbackAction(input: FeedbackInput): Promise<{ ok: boolean }> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    question_id: parsed.data.questionId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
  });
  return { ok: !error };
}
