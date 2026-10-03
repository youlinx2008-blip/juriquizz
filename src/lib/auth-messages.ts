/** Messages d'erreur d'authentification, en clair pour l'utilisateur. */
export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "E-mail ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Adresse pas encore confirmée : clique sur le lien reçu par e-mail.";
    case "user_already_exists":
    case "email_exists":
      return "Un compte existe déjà avec cet e-mail. Connecte-toi.";
    case "weak_password":
      return "Mot de passe trop faible : 8 caractères au moins.";
    case "email_address_invalid":
      return "Adresse e-mail invalide.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Trop de demandes en peu de temps. Réessaie dans quelques minutes.";
    case "otp_expired":
      return "Ce code ou ce lien a expiré. Demande-en un nouveau.";
    case "signup_disabled":
      return "Les inscriptions sont fermées pour le moment.";
    default:
      return "Une erreur est survenue. Réessaie dans un instant.";
  }
}

export const BETA_CODE_MESSAGES: Record<string, string> = {
  invalide: "Ce code bêta n'existe pas. Vérifie l'orthographe.",
  expire: "Ce code bêta a expiré.",
  epuise: "Ce code bêta a déjà servi le nombre de fois prévu.",
};
