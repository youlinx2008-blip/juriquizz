# Contenu des cours

Ce dossier accueille les fichiers de contenu (un fichier JSON par matière). **Ils ne sont jamais versionnés** :
le dépôt est public, alors que le contenu est destiné à être vendu et repose sur l'accord écrit des
enseignants. Seul ce fichier d'explication est suivi par Git.

## Importer ou mettre à jour une matière

```bash
npm run content:import -- content/questions.json --essai     # vérifie le fichier, n'écrit rien
npm run content:import -- content/questions.json             # importe (matière masquée si elle est nouvelle)
npm run content:import -- content/questions.json --publier   # importe et rend la matière visible
npm run content:verify -- content/questions.json             # compare la base au fichier
```

L'import est idempotent et se fait en une seule transaction :

- une **nouvelle question** prend le statut de relecture du fichier (`a_relire` par défaut) ;
- une question **modifiée** (énoncé, options, réponse, indice, explication, type ou décor) repasse au statut du
  fichier, donc « à relire » : la relecture faite sur l'ancienne version ne vaut plus ;
- une question **inchangée** garde le statut donné dans l'administration, même si on la déplace ;
- une question **absente du fichier** est retirée (masquée, historique conservé), puis revient si elle réapparaît ;
- un identifiant de question déjà utilisé par une autre matière est refusé (rien n'est importé).

## Format

Voir `tests/fixtures/matiere-exemple.json` (contenu fictif, utilisé par les tests). En bref :

```jsonc
{
  "id": "introduction-historique-au-droit", // facultatif : sinon tiré de "cours"
  "cours": "Introduction historique au droit",
  "statut_relecture_par_defaut": "a_relire",
  "chapitres": [
    {
      "id": "apres-rome", "numero": "I", "libelle": "Chapitre I", "titre": "Après Rome",
      "decor_par_defaut": "ruines", "resume": "…",
      "niveaux": {
        "facile": [
          {
            "id": "apres-rome-facile-01", "ordre_cours": 5, "type": "qcm", "decor": "ruines",
            "enonce": "…",
            "options": [{ "id": "a", "texte": "…" }, { "id": "b", "texte": "…" }, { "id": "c", "texte": "…" }, { "id": "d", "texte": "…" }],
            "bonne_reponse": "b", "indice": "…", "explication": ["paragraphe 1", "paragraphe 2"], "relecture": "a_relire"
          }
        ],
        "intermediaire": [], "confirme": []
      }
    }
  ]
}
```

Règles vérifiées à l'import : identifiants en minuscules et tirets, uniques ; options `a`, `b`, `c`… dans
l'ordre (ou `v` puis `f` pour un vrai/faux) ; bonne réponse parmi les options ; au moins un paragraphe
d'explication ; décors parmi `ruines`, `frontiere`, `codex`, `eglise`, `plaine`, `mer`, `chateau`. Les options
sont affichées **dans l'ordre du fichier**, jamais mélangées (les explications citent les lettres).

Un chapitre sans question apparaît « En préparation ».

## Cours en PDF et démonstration

Les cours en PDF ne passent pas par ce dossier : ils se déposent tels quels dans l'administration
(`/admin/cours`, un fichier par chapitre), qui les range dans un stockage privé. Les questions du mini-quiz de
démonstration se choisissent dans `/admin/questions` (bouton « Démo ») ; seules les questions relues y figurent.
Une réimportation garde ce choix ; une question modifiée repasse toutefois « à relire » et quitte la démonstration
jusqu'à sa relecture.
