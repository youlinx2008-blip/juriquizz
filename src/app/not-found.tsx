import Link from "next/link";

export default function NotFound() {
  return (
    <section className="paper pad">
      <p className="course">Page introuvable</p>
      <h1 className="title small">Cette page n&rsquo;existe pas</h1>
      <p className="lead">Le lien est peut-être incomplet, ou le contenu n&rsquo;est plus disponible.</p>
      <div className="actions">
        <Link className="btn primary" href="/">
          Retour à l&rsquo;accueil
        </Link>
      </div>
    </section>
  );
}
