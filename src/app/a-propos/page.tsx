import type { Metadata } from "next";
import { SceneSetter } from "@/components/scene-setter";

export const metadata: Metadata = { title: "À propos" };

/*
 * Texte proposé dans le cahier des charges : à valider par l'auteur avant l'ouverture de la bêta.
 */
export default function AboutPage() {
  return (
    <>
      <SceneSetter decor="codex" />
      <article className="paper pad prose">
        <p className="course">À propos</p>
        <h1 className="title small">Qui fait JuriQuizz ?</h1>
        <p className="lead">
          JuriQuizz est un projet d&rsquo;étudiant. Les cours et les quiz sont réalisés par moi à partir de
          mes notes de L1 de droit, mis en forme avec l&rsquo;aide d&rsquo;outils d&rsquo;intelligence
          artificielle, puis relus par mes soins. Ils ne remplacent ni le cours, ni les manuels, ni les
          indications de vos enseignants. Une erreur ? Signalez-la depuis la question concernée.
        </p>

        <h2>La relecture des questions</h2>
        <p>
          Chaque question a un statut de relecture. Pendant la bêta, les questions qui n&rsquo;ont pas encore
          été relues restent visibles, avec la mention « en cours de relecture ». Une question jugée
          incorrecte est retirée jusqu&rsquo;à sa correction.
        </p>

        <h2>Signaler un problème</h2>
        <p>
          Après chaque réponse, la question « Cette question est-elle claire ? » permet de dire qu&rsquo;un
          énoncé est confus ou de signaler une erreur, avec un commentaire si besoin. Les taux de réussite par
          question servent aussi à repérer les énoncés mal formulés.
        </p>

        <h2>Décors et son</h2>
        <p>
          Les décors sont dessinés pour le projet. Le son est synthétisé par le navigateur, sans aucun fichier
          audio. Les deux se règlent ou se coupent à tout moment (en haut de la page), et les animations
          s&rsquo;arrêtent si l&rsquo;appareil demande de réduire les animations.
        </p>

        <h2 id="donnees">Tes données</h2>
        <ul>
          <li>
            Ce qui est conservé : ton adresse e-mail, ton pseudo, tes réglages, tes scores et tes réponses aux
            quiz, et les retours que tu envoies.
          </li>
          <li>
            À quoi ça sert : faire fonctionner ton compte, garder ta progression, améliorer les questions.
          </li>
          <li>Aucune publicité, aucun cookie de suivi : seul le cookie de connexion est utilisé.</li>
          <li>Tu peux supprimer ton compte et toutes ces données à tout moment, depuis la page Compte.</li>
        </ul>
      </article>
    </>
  );
}
