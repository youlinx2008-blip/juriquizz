/**
 * Politique de sécurité du contenu : scripts du site seulement (avec le nonce de la requête),
 * aucune intégration dans un autre site, connexions limitées au site et à Supabase.
 * Les styles en ligne restent permis (attributs `style` de React).
 */
export function contentSecurityPolicy(options: {
  nonce: string;
  /** Adresse du projet Supabase (dépôt des cours en PDF depuis l'administration). */
  supabaseUrl: string;
  /** Site servi en HTTPS : les éventuelles adresses en HTTP sont réécrites. */
  secure: boolean;
  /** Serveur de développement : rechargement à chaud (eval, websocket). */
  dev: boolean;
}): string {
  const supabase = originOf(options.supabaseUrl);
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${options.nonce}' 'strict-dynamic'${options.dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${supabase ? ` ${supabase}` : ""}${options.dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // Sans JavaScript, la commande est un envoi de formulaire redirigé vers la page de paiement.
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    ...(options.secure ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Nonce aléatoire, différent à chaque requête. */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
