"use client";

import { useActionState } from "react";
import {
  deleteAccountAction,
  updateDisplayNameAction,
  updatePasswordAction,
  type AccountFormState,
} from "@/app/actions/account";

function Status({ state }: { state: AccountFormState }) {
  if (state.status === "idle") return null;
  return (
    <p
      className={`notice ${state.status === "ok" ? "good" : "bad"}`}
      role={state.status === "ok" ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

export function DisplayNameForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(updateDisplayNameAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      <div className="field">
        <label htmlFor="displayName">Pseudo</label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={60}
          defaultValue={initial}
          autoComplete="nickname"
        />
      </div>
      <Status state={state} />
      <div>
        <button className="btn" type="submit" disabled={pending}>
          Enregistrer le pseudo
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(updatePasswordAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      <div className="field">
        <label htmlFor="new-password">Nouveau mot de passe</label>
        <input
          id="new-password"
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="confirm-password">Confirmation</label>
        <input
          id="confirm-password"
          name="confirm"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <p className="help">Utile aussi si tu t&rsquo;es inscrit par lien e-mail et veux un mot de passe.</p>
      </div>
      <Status state={state} />
      <div>
        <button className="btn" type="submit" disabled={pending}>
          Enregistrer le mot de passe
        </button>
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(deleteAccountAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      <p style={{ margin: 0 }}>
        La suppression efface ton compte, tes scores, tes réponses et tes retours. Elle est définitive.
      </p>
      <div className="field">
        <label htmlFor="delete-confirm">Pour confirmer, écris SUPPRIMER</label>
        <input id="delete-confirm" name="confirm" type="text" autoComplete="off" required />
      </div>
      <Status state={state} />
      <div>
        <button className="btn danger" type="submit" disabled={pending}>
          Supprimer mon compte
        </button>
      </div>
    </form>
  );
}
