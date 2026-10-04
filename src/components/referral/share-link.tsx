"use client";

import { useState, useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/** Lien d'invitation : copie en un geste, ou partage par les applications du téléphone. */
export function ShareLink({ url }: { url: string }) {
  const [status, setStatus] = useState("");
  // Partage natif (téléphones) : connu seulement dans le navigateur, après l'hydratation.
  const canShare = useSyncExternalStore(
    noSubscription,
    () => typeof navigator.share === "function",
    () => false,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Lien copié.");
    } catch {
      setStatus("Copie impossible : sélectionne le lien pour le copier.");
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "JuriQuizz",
        text: "Je révise mes cours de droit avec JuriQuizz : voici mon lien d’invitation.",
        url,
      });
    } catch {
      // Partage annulé : rien à signaler.
    }
  }

  return (
    <div className="share-link">
      <label htmlFor="lien-parrainage" className="visually-hidden">
        Ton lien d&rsquo;invitation
      </label>
      <input
        id="lien-parrainage"
        type="text"
        readOnly
        value={url}
        onFocus={(event) => event.target.select()}
      />
      <div className="actions" style={{ margin: "10px 0 0" }}>
        <button className="btn primary" type="button" onClick={copy}>
          Copier le lien
        </button>
        {canShare && (
          <button className="btn" type="button" onClick={share}>
            Partager
          </button>
        )}
      </div>
      <p className="fine" role="status" style={{ marginTop: 6, minHeight: "1.2em" }}>
        {status}
      </p>
    </div>
  );
}
