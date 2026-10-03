# JuriQuizz

Application web (PWA, mobile d'abord) de quiz de révision pour les étudiants de L1 de droit : pour chaque
chapitre d'un cours, des quiz en trois niveaux (facile, intermédiaire, confirmé) avec correction immédiate et
explications détaillées, dans une ambiance visuelle et sonore qui suit le chapitre et la question.

Stack : Next.js 16 (App Router, TypeScript), Supabase (authentification, Postgres avec row-level security),
hébergement prévu sur Vercel en région Paris et Supabase en région Union européenne. Tests : Vitest (logique et
base de données), Playwright (parcours sur ordinateur et mobile, en clair et en sombre).

## État : phase 0, bêta gratuite

| Demandé pour la phase 0                                                                              | Où c'est                                           |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Comptes par e-mail et mot de passe, ou par lien e-mail (avec un code à 6 chiffres en secours)        | `/inscription`, `/connexion`, `/auth/confirm`      |
| Codes d'invitation bêta (vérifiés avant la création du compte, utilisables ensuite sur `/activer`)   | `/admin/codes`, `npm run beta:code`                |
| Import de `questions.json`, même ordre et mêmes explications que le fichier                          | `npm run content:import`, `npm run content:verify` |
| Chapitres, quiz à trois niveaux, score, explications, « Refaire mes erreurs »                        | `/cours`, `/cours/[matière]/[chapitre]/[niveau]`   |
| Progression enregistrée côté serveur (score recalculé par la base)                                   | `/progression`, fonction SQL `submit_attempt`      |
| Décors et son repris du prototype, réglages mémorisés dans le profil                                 | `src/lib/decors`, `src/lib/sound`                  |
| Administration : codes bêta, statut de relecture, masquer une matière, taux de réussite par question | `/admin`                                           |
| Retour « Cette question est-elle claire ? »                                                          | sous chaque correction ; lu dans `/admin/retours`  |

Pas encore fait, volontairement (phase 1, après confirmation du statut juridique, des accords écrits des
enseignants et des CGV) : paiement, pages légales, cours en PDF, mini-quiz de démonstration. Phase 2 : Premium,
parrainage, déblocage des niveaux à 70 %, examens blancs.

## Démarrer en local

Prérequis : Node.js 20.9 ou plus, Docker (pour la base locale).

```bash
npm install
npx supabase start                 # base locale, API, e-mails de test (http://127.0.0.1:54324)
cp .env.example .env.local         # puis compléter avec les valeurs de `npx supabase status -o env`
npm run content:import -- content/questions.json --publier
npm run beta:code -- --utilisations=5     # code pour créer le premier compte
npm run dev                        # http://localhost:3000
```

Créer ensuite un compte sur `/inscription` avec ce code, puis lui donner le rôle d'administrateur :

```bash
npm run admin:add -- prenom.nom@example.com
```

Le contenu des cours ne fait pas partie du dépôt (voir `content/README.md`). Pour essayer sans le vrai contenu :
`npm run content:import -- tests/fixtures/matiere-exemple.json --publier`.

## Scripts

| Commande                                                                                    | Rôle                                                                                                      |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`                                                           | Application                                                                                               |
| `npm run lint`, `npm run typecheck`, `npm run format`                                       | Qualité du code                                                                                           |
| `npm test`                                                                                  | Tests de logique (contenu, quiz, progression, réglages, décors)                                           |
| `npm run test:db`                                                                           | Tests de la base : RLS, accès, codes, parties, administration, import (base locale requise)               |
| `npm run test:e2e`                                                                          | Parcours Playwright sur 4 configurations (base locale requise ; construit l'application sur le port 3100) |
| `npm run content:import -- <fichier> [--publier] [--essai]`                                 | Importe une matière                                                                                       |
| `npm run content:verify -- <fichier>`                                                       | Vérifie que la base contient exactement le fichier                                                        |
| `npm run beta:code -- [--utilisations=N] [--libelle=…] [--code=…] [--fin-acces=AAAA-MM-JJ]` | Crée un code bêta                                                                                         |
| `npm run admin:add -- <email> [--retirer]`                                                  | Donne ou retire le rôle d'administrateur                                                                  |
| `npm run db:reset`, `npm run db:types`                                                      | Recrée la base locale, régénère les types TypeScript                                                      |

Les tests de parcours utilisent la matière d'exemple ; pour les jouer sur le vrai contenu (108 questions) :
`E2E_CONTENT=content/questions.json npm run test:e2e`. Ils créent leurs comptes et codes, puis les effacent.

## Mise en production

1. **Supabase** : créer un projet en région Union européenne (Paris si possible), puis appliquer le schéma :
   `npx supabase link --project-ref <ref>` et `npx supabase db push`.
2. **Authentification** (tableau de bord Supabase) :
   - URL du site : l'adresse publique ; URL de redirection autorisée : `https://<domaine>/**` ;
   - modèles d'e-mails « Confirm signup » et « Magic link » : reprendre `supabase/templates/*.html` (le lien
     pointe vers `/auth/confirm` et l'e-mail donne aussi le code à 6 chiffres, utile quand le lien s'ouvre dans
     un autre navigateur que l'application installée) ;
   - confirmation des adresses e-mail activée, mot de passe de 8 caractères minimum ;
   - **un serveur SMTP est indispensable** : l'envoi intégré de Supabase est réservé aux essais et très limité.
3. **Vercel** : importer le dépôt (région `cdg1` déjà configurée dans `vercel.json`) et définir
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` et `NEXT_PUBLIC_SITE_URL`.
   La clé secrète Supabase ne va **jamais** sur Vercel : l'application n'en a pas besoin.
4. **Contenu et premier compte**, depuis votre machine, avec les valeurs du projet de production dans
   l'environnement (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) : `npm run content:import -- … --publier`,
   `npm run beta:code -- …`, inscription sur le site, puis `npm run admin:add -- <email>`.

## Choix techniques

- **Sécurité** : toutes les tables sont protégées par la RLS ; un étudiant ne lit que ses propres parties,
  réponses, accès et retours ; les questions ne sont lisibles qu'avec un accès valide et si la matière est
  visible. Les écritures sensibles passent par des fonctions SQL qui vérifient l'appelant (code bêta, partie
  terminée, actions d'administration). Le score est recalculé par la base. Les administrateurs sont listés dans
  la table `admins` (modifiable seulement avec la clé secrète).
- **Relecture** : `a_relire` (visible en bêta avec la mention « en cours de relecture »), `relue` (visible par
  tous les accès), et `a_corriger`, ajouté pour pouvoir retirer immédiatement une question fausse. Les futurs
  détenteurs d'un pass ne verront que les questions relues ; les testeurs bêta voient aussi celles à relire.
- **Décors** : les sept ambiances du prototype, découpées en un module par décor, produisent exactement le même
  dessin (empreintes vérifiées par les tests). Seul le décor affiché est animé, avec un fondu vers le suivant ;
  réglage animé, fixe ou sans décor ; animations coupées si l'appareil demande moins de mouvement.
- **Son** : moteur du prototype (`Snd`) porté tel quel en TypeScript : synthèse Web Audio, aucun fichier audio,
  démarrage au premier geste, pause quand l'onglet est masqué, volume et activation mémorisés.
- **Hors ligne** : une partie terminée sans réseau est gardée dans le navigateur et envoyée au retour de la
  connexion ; le service worker ne met jamais en cache les pages (données personnelles), seulement les fichiers
  statiques et une page hors ligne.
- **Vie privée** : pas de cookie de suivi ; seuls les cookies de session de Supabase. Les réglages sont gardés
  dans le navigateur et dans le profil.

## Points à trancher par l'auteur

- **Le dépôt GitHub est public** : le contenu (`questions.json`) et le prototype n'y ont pas été ajoutés, pour ne
  pas publier le contenu payant. Si le dépôt passe en privé, le contenu peut y être versionné.
- Texte de la page « À propos » : repris tel quel du cahier des charges (au vouvoiement, alors que l'application
  tutoie comme le prototype), à valider.
- Avant d'ouvrir la bêta à 300 étudiants : choisir un fournisseur SMTP, et prévoir au moins des mentions légales
  et une politique de confidentialité (la page « À propos » liste déjà les données conservées).
- Date de fin de la bêta : chaque code peut porter une date de fin d'accès ; sans date, l'accès dure jusqu'à ce
  qu'une date soit fixée.
- Les décisions ouvertes du cahier des charges (nom, statut juridique, accords des enseignants, prix, matière du
  mini-quiz) restent à prendre avant la phase 1.

## Organisation du code

```
src/app/            pages (accueil, comptes, cours, quiz, progression, compte, administration)
src/app/actions/    actions serveur (comptes, quiz, réglages, administration)
src/components/     décor, son, quiz, en-tête, formulaires
src/lib/content/    format des fichiers de contenu, validation, conversion pour l'import
src/lib/decors/     registre des décors et dessins SVG (un fichier par ambiance)
src/lib/sound/      moteur sonore
src/lib/quiz/       moteur de quiz (états, score, raccourcis clavier), progression
supabase/           configuration locale, migrations SQL, modèles d'e-mails
scripts/            import du contenu, codes bêta, administrateurs
tests/              tests de la base, parcours Playwright, matière d'exemple
```
