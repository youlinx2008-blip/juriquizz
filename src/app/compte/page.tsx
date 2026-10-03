import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { SceneSetter } from "@/components/scene-setter";
import { requireViewer } from "@/lib/auth";
import { formatDay, isPast } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountForm, DisplayNameForm, PasswordForm } from "./account-forms";
import { PrefsForm } from "./prefs-form";

export const metadata: Metadata = { title: "Mon compte" };

const PLAN_LABELS: Record<string, string> = { beta: "Testeur bêta" };

export default async function AccountPage() {
  const viewer = await requireViewer("/compte");
  const supabase = await createClient();
  const { data: entitlements } = await supabase
    .from("entitlements")
    .select("id, plan, starts_at, ends_at")
    .eq("user_id", viewer.userId)
    .order("starts_at", { ascending: false });

  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">Mon compte</p>
        <h1 className="title small">{viewer.displayName || "Mon compte"}</h1>
        <p className="lead">{viewer.email}</p>
      </section>

      <section className="paper pad" aria-labelledby="acces-titre">
        <h2 id="acces-titre" style={{ marginTop: 0 }}>
          Mon accès
        </h2>
        {viewer.isAdmin && <p className="notice">Compte d&rsquo;administration : accès complet.</p>}
        {(entitlements ?? []).length === 0 && !viewer.isAdmin && (
          <p>
            Aucun accès actif. <Link href="/activer">Saisir un code bêta</Link>
          </p>
        )}
        <ul style={{ paddingLeft: 20, margin: "8px 0 0" }}>
          {(entitlements ?? []).map((entitlement) => {
            const ended = isPast(entitlement.ends_at);
            return (
              <li key={entitlement.id}>
                <strong>{PLAN_LABELS[entitlement.plan] ?? entitlement.plan}</strong>, depuis le{" "}
                {formatDay(entitlement.starts_at)}
                {entitlement.ends_at
                  ? `, ${ended ? "terminé le" : "jusqu’au"} ${formatDay(entitlement.ends_at)}`
                  : ", jusqu’à la fin de la bêta"}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="paper pad" aria-labelledby="reglages-titre">
        <h2 id="reglages-titre" style={{ marginTop: 0 }}>
          Son, décor et apparence
        </h2>
        <PrefsForm />
      </section>

      <section className="paper pad" aria-labelledby="profil-titre">
        <h2 id="profil-titre" style={{ marginTop: 0 }}>
          Profil et connexion
        </h2>
        <DisplayNameForm initial={viewer.displayName} />
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "20px 0" }} />
        <PasswordForm />
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "20px 0" }} />
        <form action={signOutAction}>
          <button className="btn" type="submit">
            Se déconnecter
          </button>
        </form>
      </section>

      <section className="paper pad" aria-labelledby="suppression-titre">
        <h2 id="suppression-titre" style={{ marginTop: 0 }}>
          Supprimer mon compte
        </h2>
        <DeleteAccountForm />
      </section>
    </>
  );
}
