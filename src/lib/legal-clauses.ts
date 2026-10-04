import { formatEuros } from "@/lib/money";

/*
 * Clauses proposées pour les CGV quand une offre de la phase 2 est ouverte. Les textes légaux restent
 * ceux que l'administration a validés : rien n'est inséré automatiquement, ces propositions sont
 * affichées à côté du réglage concerné, à reprendre (et faire relire) dans la page Textes légaux.
 */

/** Les CGV parlent-elles déjà de cette offre ? (Recherche simple, sans tenir compte de la casse.) */
export function mentions(text: string, word: string): boolean {
  return text.toLocaleLowerCase("fr-FR").includes(word.toLocaleLowerCase("fr-FR"));
}

export const PREMIUM_CLAUSE = `- **Pass Année Premium** : comme le Pass Année, jusqu'à la fin des partiels de l'année universitaire en cours, avec en plus les exclusivités Premium (chapitres et examens blancs réservés) indiquées sur la page « Tarifs ». Le titulaire d'un Pass Année en cours, valable jusqu'à la même date, qui passe au Premium ne paie que la différence de prix.

Les exclusivités Premium ne sont pas comprises dans les autres pass. Un contenu déjà proposé dans les autres pass n'est jamais retiré pour devenir une exclusivité Premium.`;

export function referralClause(settings: {
  discountCents: number;
  bonusDays: number;
  maxPerYear: number;
}): string {
  return `## Parrainage

Lorsque le parrainage est proposé, chaque titulaire d'un compte peut inviter des proches au moyen d'un lien personnel. La personne invitée (le filleul) bénéficie d'une réduction de ${formatEuros(settings.discountCents)} sur son premier achat d'un pass. Lorsque ce premier achat est confirmé, le parrain reçoit ${settings.bonusDays} jour${settings.bonusDays > 1 ? "s" : ""} d'accès offerts, qui prennent la suite de son accès en cours, dans la limite de ${settings.maxPerYear} parrainage${settings.maxPerYear > 1 ? "s" : ""} récompensé${settings.maxPerYear > 1 ? "s" : ""} par an. Les jours offerts sont retirés si l'achat du filleul est remboursé. Aucun avantage n'est accordé entre des comptes utilisés sur le même appareil. Ces conditions peuvent évoluer ; celles en vigueur sont indiquées sur la page « Parrainage ».`;
}

/** Politique de confidentialité, rubrique « Données conservées et finalités ». */
export const PRIVACY_EXAMS_CLAUSE = `- **Examens blancs** : questions tirées, réponses, note, heures de début et de remise de chaque épreuve. Finalités : corriger la copie et garder l'historique des notes (exécution du contrat). Pendant une épreuve, les réponses sont aussi gardées dans le navigateur, sur l'appareil seulement, jusqu'à la remise de la copie.`;

export const PRIVACY_REFERRAL_CLAUSE = `- **Parrainage** : code de parrainage, compte qui a invité l'utilisateur (le cas échéant), avantages accordés. Finalité : appliquer la réduction du filleul et les jours offerts au parrain (exécution du contrat). Pour éviter les abus, l'identifiant d'appareil décrit plus haut sert aussi à vérifier que le parrain et le filleul n'utilisent pas le même appareil (intérêt légitime).`;
