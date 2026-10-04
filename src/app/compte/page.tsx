import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { revokeDeviceAction } from "@/app/actions/account";
import { signOutAction } from "@/app/actions/auth";
import { SceneSetter } from "@/components/scene-setter";
import { requireViewer } from "@/lib/auth";
import { formatDay, formatDayTime, isPast } from "@/lib/dates";
import { DEVICE_COOKIE } from "@/lib/devices";
import { formatEuros } from "@/lib/money";
import { planName } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountForm, DisplayNameForm, FullNameForm, PasswordForm } from "./account-forms";
import { PrefsForm } from "./prefs-form";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const viewer = await requireViewer("/compte");
  const supabase = await createClient();
  const browserKey = (await cookies()).get(DEVICE_COOKIE)?.value;
  const [{ data: entitlements }, { data: payments }, { data: devices }, { data: settings }] =
    await Promise.all([
      supabase
        .from("entitlements")
        .select("id, plan, starts_at, ends_at")
        .eq("user_id", viewer.userId)
        .order("starts_at", { ascending: false }),
      supabase
        .from("payments")
        .select(
          "id, plan, status, amount_cents, discount_cents, discount_reason, paid_at, refunded_at, cgv_version",
        )
        .eq("user_id", viewer.userId)
        .in("status", ["paye", "rembourse"])
        .order("created_at", { ascending: false }),
      supabase
        .from("device_sessions")
        .select("id, browser_key, label, created_at, last_seen_at")
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("settings").select("referral_enabled").maybeSingle(),
    ]);

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
        {!viewer.hasAccess && (
          <p>
            Aucun accès en cours. <Link href="/tarifs">Voir les pass</Link>
          </p>
        )}
        <ul style={{ paddingLeft: 20, margin: "8px 0 0" }}>
          {(entitlements ?? []).map((entitlement) => {
            const ended = isPast(entitlement.ends_at);
            return (
              <li key={entitlement.id}>
                <strong>{entitlement.plan === "beta" ? "Testeur bêta" : planName(entitlement.plan)}</strong>,
                depuis le {formatDay(entitlement.starts_at)}
                {entitlement.ends_at
                  ? `, ${ended ? "terminé le" : "jusqu’au"} ${formatDay(entitlement.ends_at)}`
                  : entitlement.plan === "beta"
                    ? ", jusqu’à la fin de la bêta"
                    : ", sans date de fin"}
              </li>
            );
          })}
        </ul>
      </section>

      {(payments ?? []).length > 0 && (
        <section className="paper pad" id="achats" aria-labelledby="achats-titre">
          <h2 id="achats-titre" style={{ marginTop: 0 }}>
            Mes achats
          </h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Pass</th>
                  <th scope="col">Montant</th>
                  <th scope="col">État</th>
                  <th scope="col">CGV acceptées</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td className="num-cell">{payment.paid_at ? formatDay(payment.paid_at) : "–"}</td>
                    <td>{planName(payment.plan)}</td>
                    <td className="num-cell">
                      {formatEuros(payment.amount_cents)}
                      {payment.discount_cents > 0 && (
                        <div className="fine">
                          {payment.discount_reason === "passage_premium"
                            ? "Pass Année déduit"
                            : "Réduction de parrainage"}{" "}
                          : −{formatEuros(payment.discount_cents)}
                        </div>
                      )}
                    </td>
                    <td>
                      {payment.status === "rembourse"
                        ? `Remboursé${payment.refunded_at ? ` le ${formatDay(payment.refunded_at)}` : ""}`
                        : "Payé"}
                    </td>
                    <td>
                      <Link href={`/cgv?version=${payment.cgv_version}`}>Version {payment.cgv_version}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine" style={{ marginTop: 10 }}>
            Le reçu de chaque paiement a été envoyé par e-mail. Pour toute question sur un achat, écris à
            l&rsquo;adresse indiquée dans les <Link href="/mentions-legales">mentions légales</Link>.
          </p>
        </section>
      )}

      {settings?.referral_enabled && (
        <section className="paper pad" aria-labelledby="parrainage-titre">
          <h2 id="parrainage-titre" style={{ marginTop: 0 }}>
            Parrainage
          </h2>
          <p style={{ margin: 0 }}>
            Invite tes camarades avec ton lien personnel : réduction pour eux, jours offerts pour toi.{" "}
            <Link href="/parrainage">Mon lien de parrainage</Link>
          </p>
        </section>
      )}

      <section className="paper pad" aria-labelledby="reglages-titre">
        <h2 id="reglages-titre" style={{ marginTop: 0 }}>
          Son, décor et apparence
        </h2>
        <PrefsForm />
      </section>

      <section className="paper pad" aria-labelledby="appareils-titre">
        <h2 id="appareils-titre" style={{ marginTop: 0 }}>
          Appareils connectés
        </h2>
        <p style={{ margin: "0 0 10px" }}>
          {viewer.isAdmin
            ? "Compte d’administration : pas de limite d’appareils."
            : "Ton compte peut être ouvert sur deux appareils à la fois. Au-delà, le plus ancien est déconnecté."}
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {(devices ?? []).map((device) => (
            <li key={device.id} style={{ marginBottom: 6 }}>
              <strong>{device.label || "Appareil"}</strong>
              {device.browser_key === browserKey ? " (cet appareil)" : ""}, connecté le{" "}
              {formatDay(device.created_at)}, vu le {formatDayTime(device.last_seen_at)}
              {device.browser_key !== browserKey && (
                <form action={revokeDeviceAction} className="inline-form" style={{ marginLeft: 8 }}>
                  <input type="hidden" name="device" value={device.id} />
                  <button className="btn small" type="submit">
                    Déconnecter<span className="visually-hidden"> : {device.label}</span>
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="paper pad" aria-labelledby="profil-titre">
        <h2 id="profil-titre" style={{ marginTop: 0 }}>
          Profil et connexion
        </h2>
        <DisplayNameForm initial={viewer.displayName} />
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "20px 0" }} />
        <FullNameForm initial={viewer.fullName ?? ""} />
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
