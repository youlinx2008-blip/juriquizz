import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SceneSetter } from "@/components/scene-setter";
import { getViewer, safeNext } from "@/lib/auth";
import { formatEuros } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

const REFERRAL_CODE = /^[A-Z2-9]{8}$/;

/** Invitation de parrainage : le code est retenu seulement s'il est valable (parrainage ouvert). */
async function referralInvitation(parrain: unknown) {
  const code = typeof parrain === "string" ? parrain.trim().toUpperCase() : "";
  if (!REFERRAL_CODE.test(code)) return { code: "", discountCents: 0, invalid: typeof parrain === "string" };
  const supabase = await createClient();
  const { data } = await supabase.rpc("referral_invitation", { p_code: code });
  const invitation = data as { valid: boolean; discount_cents: number } | null;
  return invitation?.valid
    ? { code, discountCents: invitation.discount_cents, invalid: false }
    : { code: "", discountCents: 0, invalid: true };
}

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: PageProps<"/inscription">) {
  const { code, suite, parrain } = await searchParams;
  const next = typeof suite === "string" ? safeNext(suite, "") : "";
  const viewer = await getViewer();
  if (viewer) redirect(next || (viewer.hasAccess ? "/cours" : "/acces"));
  const invitation = await referralInvitation(parrain);
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
        {invitation.code ? (
          <p className="notice good" role="status" style={{ marginBottom: 18 }}>
            Invitation de parrainage
            {invitation.discountCents > 0
              ? ` : ${formatEuros(invitation.discountCents)} de réduction sur ton premier pass, appliqués automatiquement à la commande.`
              : " : bienvenue sur JuriQuizz !"}
          </p>
        ) : (
          invitation.invalid && (
            <p className="notice" role="status" style={{ marginBottom: 18 }}>
              Ce lien de parrainage n&rsquo;est plus valable ; tu peux tout de même créer ton compte.
            </p>
          )
        )}
        <SignupForm
          initialCode={typeof code === "string" ? code : ""}
          next={next}
          referralCode={invitation.code}
        />
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
