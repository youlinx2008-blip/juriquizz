import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="paper foot">
      <p style={{ margin: 0 }}>
        JuriQuizz, des quiz de révision pour la L1 de droit. Le son est synthétisé dans ton navigateur : aucun
        fichier audio n&rsquo;est chargé.
      </p>
      <nav aria-label="Pied de page">
        <Link href="/a-propos">À propos</Link>
        <Link href="/tarifs">Tarifs</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/cgu">CGU</Link>
        <Link href="/cgv">CGV</Link>
        <Link href="/confidentialite">Confidentialité</Link>
      </nav>
    </footer>
  );
}
