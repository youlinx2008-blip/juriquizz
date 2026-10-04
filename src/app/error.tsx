"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="paper pad">
      <p className="course">Erreur</p>
      <h1 className="title small">Quelque chose s&rsquo;est mal passé</h1>
      <p className="lead">Vérifie ta connexion, puis réessaie.</p>
      <div className="actions">
        <button className="btn primary" type="button" onClick={reset}>
          Réessayer
        </button>
      </div>
    </section>
  );
}
