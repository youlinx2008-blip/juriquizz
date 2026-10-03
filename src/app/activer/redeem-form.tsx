"use client";

import { useActionState } from "react";
import { redeemCodeAction, type RedeemState } from "@/app/actions/auth";
import { FieldError, invalidProps } from "@/components/forms/field-error";

export function RedeemForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<RedeemState, FormData>(redeemCodeAction, {
    status: "idle",
  });
  const error = state.status === "error" ? state.message : undefined;
  return (
    <form className="form" action={action}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="betaCode">Code bêta</label>
        <input
          id="betaCode"
          name="betaCode"
          type="text"
          className="code-input"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          {...invalidProps("betaCode-error", error)}
        />
        <FieldError id="betaCode-error" message={error} />
      </div>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Vérification…" : "Activer mon accès"}
        </button>
      </div>
    </form>
  );
}
