"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUpAction, type AuthFormState } from "@/app/actions/auth";
import { EmailSent } from "@/components/forms/email-sent";
import { FieldError, invalidProps } from "@/components/forms/field-error";

export function SignupForm({
  initialCode,
  next,
  referralCode = "",
}: {
  initialCode: string;
  next: string;
  referralCode?: string;
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUpAction, { status: "idle" });
  const [method, setMethod] = useState<"password" | "link">("password");

  if (state.status === "check-email") return <EmailSent email={state.email} next={state.next} />;

  const fields = state.status === "error" ? (state.fields ?? {}) : {};
  return (
    <form className="form" action={action} noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {referralCode && <input type="hidden" name="referralCode" value={referralCode} />}
      {state.status === "error" && (
        <p className="notice bad" role="alert">
          {state.message}
        </p>
      )}
      <div className="field">
        <label htmlFor="displayName">Pseudo (facultatif)</label>
        <input id="displayName" name="displayName" type="text" autoComplete="nickname" maxLength={60} />
        <p className="help">Affiché seulement sur ton compte.</p>
      </div>
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
      <fieldset className="field">
        <legend>Connexion</legend>
        <div className="radios">
          <label>
            <input
              type="radio"
              name="method"
              value="password"
              checked={method === "password"}
              onChange={() => setMethod("password")}
            />
            Avec un mot de passe
          </label>
          <label>
            <input
              type="radio"
              name="method"
              value="link"
              checked={method === "link"}
              onChange={() => setMethod("link")}
            />
            Par lien e-mail, sans mot de passe
          </label>
        </div>
      </fieldset>
      {method === "password" && (
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            {...invalidProps("password-error", fields.password)}
          />
          <p className="help">8 caractères au moins.</p>
          <FieldError id="password-error" message={fields.password} />
        </div>
      )}
      <div className="field">
        <label htmlFor="betaCode">Code d&rsquo;invitation (facultatif)</label>
        <input
          id="betaCode"
          name="betaCode"
          type="text"
          className="code-input"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={initialCode}
          aria-describedby={fields.betaCode ? "betaCode-error betaCode-help" : "betaCode-help"}
          aria-invalid={fields.betaCode ? true : undefined}
        />
        <p className="help" id="betaCode-help">
          Pour les testeurs de la bêta : accès gratuit jusqu&rsquo;à la fin de la bêta.
        </p>
        <FieldError id="betaCode-error" message={fields.betaCode} />
      </div>
      <div className="consents">
        <div>
          <label>
            <input
              type="checkbox"
              name="acceptTerms"
              required
              {...invalidProps("acceptTerms-error", fields.acceptTerms)}
            />
            <span>
              J&rsquo;accepte les{" "}
              <Link href="/cgu" target="_blank" rel="noopener">
                conditions générales d&rsquo;utilisation
              </Link>
              .
            </span>
          </label>
          <FieldError id="acceptTerms-error" message={fields.acceptTerms} />
        </div>
      </div>
      <p className="help" style={{ margin: 0 }}>
        Sont conservés : ton e-mail, ton pseudo, tes réglages et ta progression. Tu peux tout supprimer à tout
        moment. <Link href="/confidentialite">Politique de confidentialité</Link>
      </p>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer mon compte"}
        </button>
      </div>
    </form>
  );
}
