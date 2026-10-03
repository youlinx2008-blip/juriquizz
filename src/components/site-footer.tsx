import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="paper foot">
      <p style={{ margin: 0 }}>
        JuriQuizz est un projet d&rsquo;étudiant, en bêta. Le son est synthétisé dans ton navigateur : aucun
        fichier audio n&rsquo;est chargé.
      </p>
      <nav aria-label="Pied de page">
        <Link href="/a-propos">À propos</Link>
        <Link href="/a-propos#donnees">Tes données</Link>
      </nav>
    </footer>
  );
}
