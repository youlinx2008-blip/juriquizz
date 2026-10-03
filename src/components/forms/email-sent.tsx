"use client";

import { useActionState } from "react";
import { verifyEmailCodeAction, type AuthFormState } from "@/app/actions/auth";
import { FieldError, invalidProps } from "./field-error";

/** Après l'envoi d'un e-mail : ouvrir le lien, ou saisir le code à 6 chiffres ici. */
export function EmailSent({ email, next }: { email: string; next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(verifyEmailCodeAction, {
    status: "idle",
  });
  const tokenError = state.status === "error" ? (state.fields?.token ?? state.message) : undefined;
  return (
    <div className="stack">
      <p className="notice good" role="status">
        Si un compte peut être ouvert ou utilisé avec <strong>{email}</strong>, un e-mail vient de partir.
        Ouvre le lien qu&rsquo;il contient, ou saisis ci-dessous le code à 6 chiffres.
      </p>
      <form className="form" action={action}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="token">Code reçu par e-mail</label>
          <input
            id="token"
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            className="code-input"
            required
            {...invalidProps("token-error", tokenError)}
          />
          <FieldError id="token-error" message={tokenError} />
        </div>
        <div className="actions">
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? "Vérification…" : "Valider le code"}
          </button>
        </div>
      </form>
    </div>
  );
}
