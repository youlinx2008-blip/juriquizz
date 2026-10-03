"use client";

import { useActionState } from "react";
import { createCodesAction, type AdminFormState } from "@/app/actions/admin";

export function CreateCodesForm() {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(createCodesAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      {state.status === "error" && (
        <p className="notice bad" role="alert">
          {state.message}
        </p>
      )}
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field">
          <label htmlFor="count">Nombre de codes</label>
          <input id="count" name="count" type="number" min={1} max={200} defaultValue={1} required />
        </div>
        <div className="field">
          <label htmlFor="usesMax">Utilisations par code</label>
          <input id="usesMax" name="usesMax" type="number" min={1} max={10000} defaultValue={1} required />
        </div>
        <div className="field">
          <label htmlFor="prefix">Préfixe</label>
          <input id="prefix" name="prefix" type="text" defaultValue="JQ" maxLength={12} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="label">Libellé (pour s&rsquo;y retrouver)</label>
        <input id="label" name="label" type="text" maxLength={120} placeholder="Ex. : groupe de TD 4" />
      </div>
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field">
          <label htmlFor="expiresAt">Utilisable jusqu&rsquo;au (facultatif)</label>
          <input id="expiresAt" name="expiresAt" type="date" />
        </div>
        <div className="field">
          <label htmlFor="accessEndsAt">Fin de l&rsquo;accès donné (facultatif)</label>
          <input id="accessEndsAt" name="accessEndsAt" type="date" />
          <p className="help">Vide : jusqu&rsquo;à la fin de la bêta.</p>
        </div>
      </div>
      <div className="field">
        <label htmlFor="code">Code choisi (facultatif)</label>
        <input
          id="code"
          name="code"
          type="text"
          className="code-input"
          maxLength={40}
          placeholder="Laisser vide pour un code aléatoire"
        />
        <p className="help">
          Un code choisi est plus facile à deviner : réservez-le à un usage limité dans le temps. Les codes
          aléatoires (8 caractères) sont recommandés.
        </p>
      </div>
      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer"}
        </button>
      </div>
    </form>
  );
}
