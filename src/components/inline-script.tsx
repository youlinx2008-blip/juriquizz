/**
 * Script exécuté pendant la lecture du HTML, avant le premier affichage. Côté client, le
 * type « text/plain » évite que React le signale (il ne s'exécute pas lors d'une navigation).
 * Le nonce de la requête l'autorise au regard de la politique de sécurité du contenu.
 */
export function InlineScript({ html, nonce }: { html: string; nonce?: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
