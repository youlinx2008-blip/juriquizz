-- JuriQuizz, phase 1 : brouillons des textes légaux.
-- Ils se modifient dans l'administration (page « Textes légaux ») et doivent être validés par l'éditeur.
-- Tant qu'un passage « [À COMPLÉTER » subsiste dans l'un d'eux, la vente reste fermée (legal_ready()).

insert into public.legal_pages (slug, title, body) values
('mentions-legales', 'Mentions légales', $md$
## Éditeur du site

JuriQuizz est édité par [À COMPLÉTER : prénom et nom], [À COMPLÉTER : statut, par exemple entrepreneur individuel sous le régime de la micro-entreprise], immatriculé sous le numéro SIRET [À COMPLÉTER : SIRET].

Adresse : [À COMPLÉTER : adresse ou domiciliation].
Contact : [À COMPLÉTER : adresse e-mail de contact].

Directeur de la publication : [À COMPLÉTER : prénom et nom].

## Hébergement

Site : [À COMPLÉTER : hébergeur du site, raison sociale, adresse et téléphone].
Base de données et comptes : [À COMPLÉTER : hébergeur de la base de données, raison sociale, adresse, région d'hébergement].

## Contenus

Les cours et les quiz sont réalisés par l'éditeur à partir de ses notes de cours de L1 de droit, avec l'accord écrit des enseignants concernés, mis en forme avec l'aide d'outils d'intelligence artificielle, puis relus par ses soins. Ils sont protégés par le droit d'auteur : toute reproduction ou diffusion, même partielle, est interdite sans autorisation écrite.

Les décors et les sons du site sont créés pour le projet.
$md$),

('cgu', 'Conditions générales d''utilisation', $md$
*En vigueur au [À COMPLÉTER : date].*

## 1. Objet

Les présentes conditions encadrent l'utilisation de JuriQuizz, service de révision en ligne (quiz, explications et cours en PDF) destiné aux étudiants en droit. Créer un compte vaut acceptation de ces conditions.

## 2. Compte

Le compte est personnel : une personne, un compte. Il peut être ouvert sur deux appareils à la fois au plus ; au-delà, la connexion la plus ancienne est fermée. L'utilisateur garde ses identifiants confidentiels.

## 3. Contenus et propriété intellectuelle

Les contenus (questions, explications, cours, décors) sont protégés par le droit d'auteur. Ils sont réservés à un usage personnel de révision. Sont notamment interdits : la copie, la diffusion, le partage du compte ou des fichiers, la revente, la publication sur un site ou un réseau social, la reproduction automatisée.

Chaque cours en PDF porte le nom et l'adresse e-mail de l'utilisateur. En cas de diffusion constatée, l'éditeur peut suspendre le compte concerné, sans préjudice d'autres recours.

## 4. Nature du service

JuriQuizz est un outil d'entraînement complémentaire. Il ne remplace ni le cours, ni les manuels, ni les indications des enseignants, et ne garantit aucun résultat aux examens. Les questions sont relues avec soin ; une erreur reste possible et peut être signalée depuis la question concernée.

## 5. Disponibilité

L'éditeur s'efforce de rendre le service accessible en permanence, sans pouvoir le garantir (maintenance, incident). Une matière peut être retirée à la demande de ses enseignants.

## 6. Suspension et suppression du compte

L'utilisateur peut supprimer son compte à tout moment depuis la page « Compte » ; un pass en cours prend alors fin, sans remboursement. L'éditeur peut suspendre un compte en cas de manquement aux présentes conditions, notamment de partage du compte ou de diffusion des contenus.

## 7. Données personnelles

Voir la politique de confidentialité.

## 8. Modification des conditions

Les conditions peuvent évoluer. La nouvelle version est proposée à l'utilisateur lors de sa connexion suivante.

## 9. Droit applicable

Les présentes conditions sont soumises au droit français. Contact : [À COMPLÉTER : adresse e-mail de contact].
$md$),

('cgv', 'Conditions générales de vente', $md$
*En vigueur au [À COMPLÉTER : date].*

## 1. Vendeur

[À COMPLÉTER : prénom et nom], [À COMPLÉTER : statut], SIRET [À COMPLÉTER : SIRET], [À COMPLÉTER : adresse]. Contact : [À COMPLÉTER : adresse e-mail].

## 2. Offres

JuriQuizz vend des pass qui donnent accès, pour une durée déterminée, à l'ensemble des quiz et des cours en PDF disponibles sur le site :

- **Pass Mensuel** : 30 jours à compter du paiement ;
- **Pass Partiels** : jusqu'à la fin des partiels de la session en cours ;
- **Pass Année** : jusqu'à la fin des partiels de l'année universitaire en cours.

La date de fin exacte est indiquée avant le paiement. Les pass ne sont pas renouvelés automatiquement : l'accès se ferme de lui-même à cette date.

## 3. Prix

Les prix sont indiqués en euros, toutes taxes comprises, sur la page « Tarifs » au moment de la commande. [À COMPLÉTER : mention fiscale, par exemple « TVA non applicable, art. 293 B du CGI »].

## 4. Commande et paiement

La commande se passe depuis un compte JuriQuizz. Le paiement, unique, se fait par carte bancaire auprès du prestataire Stripe ; JuriQuizz n'a jamais connaissance des données bancaires. Un reçu est envoyé par e-mail.

## 5. Accès au contenu et droit de rétractation

L'accès est ouvert dès la confirmation du paiement. S'agissant d'un contenu numérique fourni immédiatement, l'acheteur demande expressément, avant le paiement, l'exécution immédiate du contrat et reconnaît perdre son droit de rétractation (article L221-28, 13°, du Code de la consommation).

## 6. Évolution et retrait des contenus

Les contenus peuvent être complétés et corrigés pendant la durée du pass. Si une matière devait être retirée à la demande de ses enseignants, [À COMPLÉTER : conséquence pour l'acheteur, par exemple remboursement au prorata de la durée restante].

## 7. Réclamations et médiation

Toute réclamation peut être adressée à [À COMPLÉTER : adresse e-mail]. En cas de litige non résolu, l'acheteur peut recourir gratuitement au médiateur de la consommation : [À COMPLÉTER : nom et coordonnées du médiateur].

## 8. Droit applicable

Les présentes conditions sont soumises au droit français.
$md$),

('confidentialite', 'Politique de confidentialité', $md$
*En vigueur au [À COMPLÉTER : date].*

## Responsable du traitement

[À COMPLÉTER : prénom et nom de l'éditeur], joignable à [À COMPLÉTER : adresse e-mail].

## Données conservées et finalités

- **Compte** : adresse e-mail, pseudo, réglages (son, décor, apparence), date d'acceptation des conditions d'utilisation. Finalité : faire fonctionner le compte (exécution du contrat).
- **Progression** : scores, réponses aux quiz, retours sur les questions. Finalités : garder la progression, améliorer les questions.
- **Appareils connectés** : date de connexion et type de navigateur, pour limiter un compte à deux appareils à la fois (intérêt légitime : éviter le partage de comptes).
- **Cours en PDF** : nom et prénom, imprimés avec l'adresse e-mail sur chaque page des cours ouverts (protection des contenus contre la diffusion, intérêt légitime) ; date de chaque consultation, pour limiter les consultations abusives (intérêt légitime).
- **Achats** : pass acheté, montant, date, acceptation des conditions de vente. Les données bancaires sont traitées par Stripe et jamais par JuriQuizz. Les achats sont conservés dix ans (obligation comptable), même après suppression du compte, sans lien avec celui-ci.

Aucune donnée n'est vendue ni utilisée à des fins publicitaires. Aucun cookie de suivi n'est déposé : seuls les cookies nécessaires à la connexion sont utilisés.

## Destinataires et hébergement

Les données sont hébergées par [À COMPLÉTER : hébergeur de la base de données et région] et [À COMPLÉTER : hébergeur du site]. Les paiements sont traités par Stripe. Les e-mails de connexion sont envoyés par [À COMPLÉTER : service d'envoi d'e-mails].

## Durées de conservation

Les données du compte sont conservées jusqu'à sa suppression. Les journaux de consultation des cours sont effacés au bout de [À COMPLÉTER : durée, par exemple douze mois].

## Vos droits

Vous pouvez accéder à vos données, les rectifier, les effacer (la suppression du compte se fait depuis la page « Compte »), en demander la portabilité ou vous opposer à certains traitements, en écrivant à [À COMPLÉTER : adresse e-mail]. Vous pouvez aussi adresser une réclamation à la CNIL (www.cnil.fr).
$md$);
