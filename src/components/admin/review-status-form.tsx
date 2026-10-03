import { setReviewStatusAction } from "@/app/actions/admin";

export const REVIEW_LABELS: Record<string, string> = {
  a_relire: "À relire",
  relue: "Relue",
  a_corriger: "À corriger (masquée)",
};

/** Changement du statut de relecture d'une question. */
export function ReviewStatusForm({ questionId, status }: { questionId: string; status: string }) {
  return (
    <form action={setReviewStatusAction} className="inline-form">
      <input type="hidden" name="questionId" value={questionId} />
      <label className="visually-hidden" htmlFor={`statut-${questionId}`}>
        Statut de relecture de {questionId}
      </label>
      <select
        id={`statut-${questionId}`}
        name="status"
        defaultValue={status}
        className="input"
        style={{ minHeight: 36, padding: "4px 8px", width: "auto" }}
      >
        {Object.entries(REVIEW_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button className="btn small" type="submit">
        Enregistrer
      </button>
    </form>
  );
}
