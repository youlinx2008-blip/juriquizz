"use client";

import { useActionState, useState } from "react";
import { emailLinkAction, passwordLoginAction, type AuthFormState } from "@/app/actions/auth";
import { EmailSent } from "@/components/forms/email-sent";
import { FieldError, invalidProps } from "@/components/forms/field-error";

export function LoginForms({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  return (
    <>
      <div className="tabs" role="group" aria-label="Mode de connexion">
        <button
          className="chip"
          type="button"
          aria-pressed={mode === "password"}
          onClick={() => setMode("password")}
        >
          Mot de passe
        </button>
        <button className="chip" type="button" aria-pressed={mode === "link"} onClick={() => setMode("link")}>
          Lien par e-mail
        </button>
      </div>
      {mode === "password" ? <PasswordForm next={next} /> : <LinkForm next={next} />}
    </>
  );
}

function PasswordForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(passwordLoginAction, {
    status: "idle",
  });
  const fields = state.status === "error" ? (state.fields ?? {}) : {};
  return (
    <form className="form" action={action} noValidate>
      {state.status === "error" && (
        <p className="notice bad" role="alert">
          {state.message}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          {...invalidProps("email-error", fields.email)}
        />
        <FieldError id="email-error" message={fields.email} />
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          {...invalidProps("password-error", fields.password)}
        />
        <FieldError id="password-error" message={fields.password} />
        <p className="help">
          Mot de passe oublié ? Choisis « Lien par e-mail », puis change-le depuis ton compte.
        </p>
      </div>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </div>
    </form>
  );
}

function LinkForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(emailLinkAction, {
    status: "idle",
  });
  if (state.status === "check-email") return <EmailSent email={state.email} next={state.next} />;
  const fields = state.status === "error" ? (state.fields ?? {}) : {};
  return (
    <form className="form" action={action} noValidate>
      {state.status === "error" && (
        <p className="notice bad" role="alert">
          {state.message}
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="link-email">Adresse e-mail</label>
        <input
          id="link-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          {...invalidProps("link-email-error", fields.email)}
        />
        <FieldError id="link-email-error" message={fields.email} />
        <p className="help">Tu recevras un lien de connexion et un code à 6 chiffres.</p>
      </div>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Envoi…" : "Recevoir un lien"}
        </button>
      </div>
    </form>
  );
}
