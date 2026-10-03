import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SceneSetter } from "@/components/scene-setter";
import { getViewer } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: PageProps<"/inscription">) {
  const viewer = await getViewer();
  if (viewer) redirect(viewer.hasAccess ? "/cours" : "/activer");
  const { code } = await searchParams;
  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">Bêta gratuite, sur invitation</p>
        <h1 className="title small">Créer un compte</h1>
        <p className="lead" style={{ marginBottom: 18 }}>
          Pendant la bêta, il faut un code d&rsquo;invitation. Il t&rsquo;a été transmis avec le lien vers
          JuriQuizz.
        </p>
        <SignupForm initialCode={typeof code === "string" ? code : ""} />
        <p style={{ marginBottom: 0 }}>
          Déjà un compte ? <Link href="/connexion">Se connecter</Link>
        </p>
      </section>
    </>
  );
}
