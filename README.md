# JuriQuizz

Application web (PWA, mobile d'abord) de quiz de révision pour les étudiants de L1 de droit : pour chaque
chapitre d'un cours, des quiz en trois niveaux (facile, intermédiaire, confirmé) avec correction immédiate et
explications détaillées, dans une ambiance visuelle et sonore qui suit le chapitre et la question ; les cours en
PDF se lisent dans l'application, avec le nom du lecteur en filigrane.

Stack : Next.js 16 (App Router, TypeScript), Supabase (authentification, Postgres avec row-level security,
stockage privé), Stripe Checkout (paiement unique), hébergement prévu sur Vercel en région Paris et Supabase en
région Union européenne. Tests : Vitest (logique et base de données), Playwright (parcours sur ordinateur et
mobile, en clair et en sombre, paiements compris grâce à un faux Stripe local).

## État : phase 1, vente

| Demandé pour la phase 1                                                                              | Où c'est                                                |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Achat d'un pass par Stripe Checkout (paiement unique, sans renouvellement)                           | `/tarifs`, `/tarifs/[pass]`, `/api/stripe/webhook`      |
| Pass Mensuel (30 jours), Partiels (fin de la session en cours), Année (fin de l'année universitaire) | prix et dates dans `/admin/vente`                       |
| Date de fin connue avant l'achat ; accès fermé automatiquement à cette date                          | commande, page de confirmation, `/acces`                |
| CGU, CGV, mentions légales, confidentialité (brouillons à compléter, versionnés)                     | `/cgu`, `/cgv`, `/mentions-legales`, `/confidentialite` |
| Cours en PDF : stockage privé, filigrane personnel côté serveur, lecture dans l'application          | `/cours/[matière]/[chapitre]/lecture`, `/admin/cours`   |
| Aperçu gratuit (couverture, sommaire) pour tous                                                      | `/apercu/[matière]/[chapitre]`                          |
| Mini-quiz de démonstration pour les comptes sans pass                                                | `/demo` ; questions choisies dans `/admin/questions`    |
| Un compte par personne, deux appareils connectés à la fois au plus                                   | `src/proxy.ts`, page « Compte »                         |
| Statuts : visiteur, inscrit sans pass, testeur bêta (jusqu'à la fin de la bêta), détenteur d'un pass | `src/lib/auth.ts`, fonctions SQL `has_access`…          |

Tout ce qui était demandé pour la phase 0 (comptes, codes bêta, import du contenu, quiz, progression, décors et
son, administration, retours) reste en place. Phase 2, non commencée : Premium, parrainage, déblocage des
niveaux à 70 %, examens blancs.

**La vente reste fermée tant que tout n'est pas prêt** : clés Stripe et clé secrète Supabase sur le serveur,
et textes légaux complets (plus aucun passage « [À COMPLÉTER » dans les quatre textes). L'état s'affiche dans
`/admin/vente`.

## Démarrer en local

Prérequis : Node.js 20.9 ou plus, Docker (pour la base locale).

```bash
npm install
npx supabase start                 # base locale, API, stockage, e-mails de test (http://127.0.0.1:54324)
cp .env.example .env.local         # puis compléter avec les valeurs de `npx supabase status -o env`
npm run content:import -- content/questions.json --publier
npm run dev                        # http://localhost:3000
```

Créer ensuite un compte sur `/inscription` (sans code, ou avec un code bêta : `npm run beta:code`), puis lui
donner le rôle d'administrateur :

```bash
npm run admin:add -- prenom.nom@example.com
```

Le contenu des cours ne fait pas partie du dépôt (voir `content/README.md`). Pour essayer sans le vrai contenu :
`npm run content:import -- tests/fixtures/matiere-exemple.json --publier`.

**Paiement en local** (mode test de Stripe, aucune carte réelle) : mettre la clé de test dans `.env.local`
(`STRIPE_SECRET_KEY=sk_test_…`), lancer `stripe listen --forward-to localhost:3000/api/stripe/webhook` (outil
en ligne de commande de Stripe) et reporter le secret affiché dans `STRIPE_WEBHOOK_SECRET`. Carte de test :
4242 4242 4242 4242, date future, n'importe quel code. Pour ouvrir la vente en local, compléter les textes dans
`/admin/textes` et saisir les dates des partiels dans `/admin/vente`.

## Scripts

| Commande                                                                                    | Rôle                                                                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev` / `build` / `start`                                                           | Application                                                                                |
| `npm run lint`, `npm run typecheck`, `npm run format`                                       | Qualité du code                                                                            |
| `npm test`                                                                                  | Tests de logique (contenu, quiz, progression, réglages, décors, filigrane, montants)       |
| `npm run test:db`                                                                           | Tests de la base : RLS, accès, codes, parties, administration, import, vente (base locale) |
| `npm run test:e2e`                                                                          | Parcours Playwright sur 4 configurations (base locale requise ; voir plus bas)             |
| `npm run content:import -- <fichier> [--publier] [--essai]`                                 | Importe une matière                                                                        |
| `npm run content:verify -- <fichier>`                                                       | Vérifie que la base contient exactement le fichier                                         |
| `npm run beta:code -- [--utilisations=N] [--libelle=…] [--code=…] [--fin-acces=AAAA-MM-JJ]` | Crée un code bêta                                                                          |
| `npm run admin:add -- <email> [--retirer]`                                                  | Donne ou retire le rôle d'administrateur                                                   |
| `npm run db:reset`, `npm run db:types`                                                      | Recrée la base locale, régénère les types TypeScript                                       |

Les tests de parcours construisent l'application (port 3100) et lancent un **faux Stripe** local
(`tests/e2e/fake-stripe.ts`, port 12111) : sessions de paiement, page de paiement et notifications signées comme
celles de Stripe, sans aucune clé réelle. Le temps des tests, ils ouvrent la vente (textes légaux complétés,
dates de partiels), déposent un PDF d'exemple et créent leurs comptes ; tout est effacé ou rétabli à la fin.
Pour les jouer sur le vrai contenu : `E2E_CONTENT=content/questions.json npm run test:e2e`.

## Mise en production

1. **Supabase** : projet en région Union européenne (Paris si possible), puis
   `npx supabase link --project-ref <ref>` et `npx supabase db push` (schéma, droits, compartiment privé
   « cours », brouillons des textes légaux).
2. **Authentification** (tableau de bord Supabase) : URL du site ; redirection autorisée `https://<domaine>/**` ;
   modèles d'e-mails « Confirm signup » et « Magic link » repris de `supabase/templates/*.html` ; confirmation
   des adresses activée ; mot de passe de 8 caractères minimum ; **un serveur SMTP est indispensable**.
3. **Stripe** :
   - compte vérifié (identité, coordonnées bancaires, nom affiché sur les relevés : « JURIQUIZZ ») ;
   - moyens de paiement : carte bancaire (Apple Pay et Google Pay en font partie) ;
   - point de terminaison de webhook `https://<domaine>/api/stripe/webhook`, avec les événements
     `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` et
     `charge.refunded` ; son secret de signature va dans `STRIPE_WEBHOOK_SECRET` ;
   - les reçus sont envoyés par Stripe à l'adresse du compte (`receipt_email`).
4. **Vercel** : importer le dépôt (région `cdg1` dans `vercel.json`) et définir :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` ;
   - côté serveur uniquement : `SUPABASE_SECRET_KEY` (confirmation des paiements, lecture des PDF originaux),
     `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Ces trois clés ne doivent jamais porter le préfixe
     `NEXT_PUBLIC_` : elles ne quittent pas le serveur.
5. **Contenu et premier compte**, depuis votre machine (`SUPABASE_URL` et `SUPABASE_SECRET_KEY` du projet de
   production dans l'environnement) : `npm run content:import -- … --publier`, inscription sur le site, puis
   `npm run admin:add -- <email>`.
6. **Ouvrir la vente**, dans l'administration :
   - `/admin/textes` : compléter et faire valider les quatre textes (la vente s'ouvre quand il ne reste aucun
     « [À COMPLÉTER ») ;
   - `/admin/vente` : dates des partiels (les deux sessions de l'année), prix, prix de lancement du Pass Partiels
     (12 € jusqu'à une date : les deux premières semaines de vente), fin de la bêta ;
   - `/admin/cours` : un PDF par chapitre, tel que fourni par l'auteur ;
   - `/admin/questions` : les questions du mini-quiz de démonstration (filtre « Questions de la démo »).

## Choix techniques

- **Sécurité** : toutes les tables sont protégées par la RLS ; les écritures sensibles passent par des fonctions
  SQL qui vérifient l'appelant. Le score est recalculé par la base. Les administrateurs sont listés dans la table
  `admins` (modifiable seulement avec la clé secrète). La clé secrète sert sur le serveur à deux choses
  seulement : confirmer les paiements et lire les PDF originaux.
- **Paiement** : à la commande, la base fige le prix et la date de fin, après l'acceptation des CGV et la
  renonciation expresse au droit de rétractation (contenu numérique fourni immédiatement, art. L221-28 13° du
  Code de la consommation), dont la version et la date sont enregistrées. L'accès s'ouvre au retour de la page
  de paiement, ou à la notification de Stripe si elle arrive avant (traitement idempotent, montant vérifié).
  Un remboursement total ferme l'accès ; un remboursement partiel le laisse ouvert. Un pass qui
  n'ajouterait aucun jour d'accès n'est pas vendu. Les achats sont conservés dix ans, même après suppression du
  compte (obligation comptable).
- **Dates des pass** : calculées par la base à partir des sessions de partiels saisies (fin de la prochaine
  session pour le Pass Partiels, de la dernière session de la même année universitaire pour le Pass Année).
  Aucune date n'est inventée : sans sessions à venir, ces pass ne sont pas en vente.
- **Cours en PDF** : fichiers dans un compartiment privé (lecture réservée au serveur). À chaque lecture, le
  serveur vérifie l'accès, note la consultation (40 par jour au plus) et produit une copie portant le nom et
  l'adresse e-mail du lecteur sur chaque page (diagonale discrète et pied de page) ; les métadonnées du fichier
  d'origine ne sont pas transmises. Le lecteur intégré dessine les pages sans bouton de téléchargement, et le
  fichier refuse de s'ouvrir directement dans le navigateur. Rien n'empêche absolument une capture : le
  filigrane permet de retrouver l'origine d'une copie diffusée.
- **Appareils** : chaque navigateur reçoit un identifiant aléatoire (cookie) ; un compte reste ouvert sur deux
  navigateurs au plus, le plus ancien étant déconnecté à sa vérification suivante (toutes les cinq minutes).
- **Relecture** : `a_relire` (visible en bêta avec la mention « en cours de relecture »), `relue` (visible par
  tous les accès), `a_corriger` (retirée). Les détenteurs d'un pass ne voient que les questions relues.
- **Textes légaux** : en Markdown dans la base, modifiables dans l'administration ; chaque modification crée une
  version, et les anciennes restent consultables (`/cgv?version=2`). Une nouvelle version des CGU est proposée à
  la connexion suivante.
- **Décors, son, hors ligne** : inchangés depuis la phase 0 (décors et moteur sonore du prototype, parties
  terminées hors connexion envoyées au retour du réseau, aucune page mise en cache).
- **Vie privée** : pas de cookie de suivi ; cookies de session et d'appareil seulement.

## Points à trancher par l'auteur

- **Textes légaux** : les brouillons couvrent ce que le site fait réellement ; restent à compléter et à faire
  valider : identité et statut de l'éditeur, SIRET, adresse, hébergeurs, mention fiscale (TVA), médiateur de la
  consommation, durée de conservation des journaux de lecture, et **la conséquence du retrait d'une matière pour
  un acheteur** (remboursement au prorata, par exemple).
- **Confirmation sur support durable** : le paiement envoyé à Stripe nomme le pass et sa date de fin, et sa
  description mentionne la demande d'exécution immédiate et la renonciation au droit de rétractation. Vérifier
  sur un reçu de test ce que Stripe en reprend ; si ce n'est pas suffisant, il faudra un e-mail de confirmation
  distinct (et donc un service d'envoi d'e-mails).
- **Nom en filigrane** : il est demandé au lecteur à sa première ouverture d'un cours (et modifiable dans
  « Compte ») ; l'adresse e-mail, elle, est vérifiée.
- **Taille des PDF** : jusqu'à 50 Mo acceptés ; un fichier léger (images compressées) s'ouvre bien plus vite sur
  téléphone.
- **Le dépôt GitHub est public** : contenu, prototype et cahier des charges n'y figurent pas.

## Organisation du code

```
src/app/            pages (accueil, comptes, tarifs, paiement, cours, lecture, quiz, compte, textes, administration)
src/app/api/        notifications Stripe, cours en PDF filigranés, aperçus
src/app/actions/    actions serveur (comptes, quiz, commande, réglages, administration)
src/components/     décor, son, quiz, lecteur de PDF, en-tête, formulaires
src/lib/pdf/        filigrane, aperçu, contrôle des fichiers déposés
src/lib/            accès, offres, paiements, appareils, dates, montants
supabase/           configuration locale, migrations SQL, modèles d'e-mails
scripts/            import du contenu, codes bêta, administrateurs
tests/              tests de la base, parcours Playwright, faux Stripe, matière d'exemple
```
