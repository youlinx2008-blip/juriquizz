import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SceneSetter } from "@/components/scene-setter";
import { getViewer, safeNext } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: PageProps<"/inscription">) {
  const { code, suite } = await searchParams;
  const next = typeof suite === "string" ? safeNext(suite, "") : "";
  const viewer = await getViewer();
  if (viewer) redirect(next || (viewer.hasAccess ? "/cours" : "/acces"));
  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">Compte gratuit</p>
        <h1 className="title small">Créer un compte</h1>
        <p className="lead" style={{ marginBottom: 18 }}>
          Un compte gratuit donne accès au mini-quiz de démonstration et à l&rsquo;aperçu des cours. Les pass
          ouvrent tous les quiz et tous les cours en PDF. Tu as reçu un code d&rsquo;invitation pour la bêta ?
          Saisis-le ici.
        </p>
        <SignupForm initialCode={typeof code === "string" ? code : ""} next={next} />
        <p style={{ marginBottom: 0 }}>
          Déjà un compte ?{" "}
          <Link href={next ? `/connexion?suite=${encodeURIComponent(next)}` : "/connexion"}>
            Se connecter
          </Link>
        </p>
      </section>
    </>
  );
}
