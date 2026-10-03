import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { SceneSetter } from "@/components/scene-setter";
import { requireViewer, safeNext } from "@/lib/auth";
import { RedeemForm } from "./redeem-form";

export const metadata: Metadata = { title: "Activer mon accès" };

export default async function ActivatePage({ searchParams }: PageProps<"/activer">) {
  const { suite } = await searchParams;
  const next = safeNext(suite);
  const viewer = await requireViewer("/activer");
  if (viewer.hasAccess) redirect(next);
  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">Ton compte est créé</p>
        <h1 className="title small">Activer mon accès</h1>
        <p className="lead" style={{ marginBottom: 18 }}>
          Pendant la bêta, l&rsquo;accès aux quiz s&rsquo;ouvre avec un code d&rsquo;invitation. Si ton code a
          été refusé à l&rsquo;inscription, ou si ton accès a pris fin, saisis un code valide ici.
        </p>
        <RedeemForm next={next} />
        <form action={signOutAction} style={{ marginTop: 14 }}>
          <button className="btn small" type="submit">
            Se déconnecter
          </button>
        </form>
      </section>
    </>
  );
}
