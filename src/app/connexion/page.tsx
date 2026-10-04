import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SceneSetter } from "@/components/scene-setter";
import { getViewer, safeNext } from "@/lib/auth";
import { LoginForms } from "./login-forms";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const { suite, erreur } = await searchParams;
  const next = safeNext(suite);
  const viewer = await getViewer();
  if (viewer) redirect(next);
  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">Bon retour</p>
        <h1 className="title small">Connexion</h1>
        {erreur === "lien" && (
          <p className="notice bad" role="alert" style={{ marginBottom: 14 }}>
            Ce lien n&rsquo;est plus valide (il a peut-être déjà servi ou expiré). Demande-en un nouveau.
          </p>
        )}
        {erreur === "appareils" && (
          <p className="notice warn" role="alert" style={{ marginBottom: 14 }}>
            Tu as été déconnecté de cet appareil : ton compte s&rsquo;est ouvert depuis sur deux autres
            appareils (deux à la fois au plus). Reconnecte-toi pour reprendre ici.
          </p>
        )}
        <LoginForms next={next} />
        <p style={{ marginBottom: 0 }}>
          Pas encore de compte ?{" "}
          <Link href={suite ? `/inscription?suite=${encodeURIComponent(next)}` : "/inscription"}>
            Créer un compte
          </Link>
        </p>
      </section>
    </>
  );
}
