"use client";

import { useId, useState } from "react";
import { sendFeedbackAction } from "@/app/actions/quiz";

type Rating = "claire" | "pas_claire" | "erreur";

/** « Cette question est-elle claire ? » : un clic, et un commentaire facultatif. */
export function QuestionFeedback({ questionId }: { questionId: string }) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const commentId = useId();

  async function send(chosen: Rating, text: string) {
    setState("sending");
    const result = await sendFeedbackAction({ questionId, rating: chosen, comment: text }).catch(() => ({
      ok: false,
    }));
    setState(result.ok ? "sent" : "error");
  }

  if (state === "sent") {
    return (
      <div className="feedback" role="status">
        <p>Merci, ton retour a bien été transmis.</p>
      </div>
    );
  }

  return (
    <div className="feedback">
      <p id={`${commentId}-q`}>Cette question est-elle claire ?</p>
      <div className="choices" role="group" aria-labelledby={`${commentId}-q`}>
        <button
          className="chip"
          type="button"
          disabled={state === "sending"}
          onClick={() => send("claire", "")}
        >
          Oui
        </button>
        <button
          className="chip"
          type="button"
          aria-pressed={rating === "pas_claire"}
          onClick={() => setRating("pas_claire")}
        >
          Pas vraiment
        </button>
        <button
          className="chip"
          type="button"
          aria-pressed={rating === "erreur"}
          onClick={() => setRating("erreur")}
        >
          Signaler une erreur
        </button>
      </div>
      {rating && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(rating, comment);
          }}
        >
          <label className="visually-hidden" htmlFor={commentId}>
            Commentaire (facultatif)
          </label>
          <textarea
            id={commentId}
            value={comment}
            maxLength={2000}
            placeholder={
              rating === "erreur"
                ? "Qu'est-ce qui est faux ? (facultatif)"
                : "Qu'est-ce qui est confus ? (facultatif)"
            }
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn small" type="submit" disabled={state === "sending"}>
              {state === "sending" ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </form>
      )}
      {state === "error" && (
        <p className="form-error" role="alert">
          Envoi impossible pour le moment. Réessaie.
        </p>
      )}
    </div>
  );
}
