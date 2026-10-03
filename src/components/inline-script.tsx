/**
 * Script exécuté pendant la lecture du HTML, avant le premier affichage. Côté client, le
 * type « text/plain » évite que React le signale (il ne s'exécute pas lors d'une navigation).
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
