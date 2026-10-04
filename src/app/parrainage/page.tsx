import type { Metadata } from "next";
import Link from "next/link";
import { SceneSetter } from "@/components/scene-setter";
import { ShareLink } from "@/components/referral/share-link";
import { requireViewer } from "@/lib/auth";
import { formatEuros } from "@/lib/money";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Parrainage" };

export default async function ReferralPage() {
  await requireViewer("/parrainage");
  const supabase = await createClient();
  const { data: settings, error } = await supabase
    .from("settings")
    .select("referral_enabled, referral_discount_cents, referral_bonus_days, referral_max_per_year")
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!settings?.referral_enabled) {
    return (
      <>
        <SceneSetter decor="codex" />
        <section className="paper pad">
          <p className="course">Parrainage</p>
          <h1 className="title small">Le parrainage n&rsquo;est pas ouvert</h1>
          <p className="lead">Il n&rsquo;y a pas de parrainage en ce moment.</p>
          <div className="actions">
            <Link className="btn" href="/compte">
              Retour au compte
            </Link>
          </div>
        </section>
      </>
    );
  }

  const [code, stats] = await Promise.all([supabase.rpc("my_referral_code"), supabase.rpc("my_referrals")]);
  if (code.error) throw new Error(code.error.message);
  const mine = (stats.data ?? { invited: 0, rewarded: 0, bonus_days: 0 }) as {
    invited: number;
    rewarded: number;
    bonus_days: number;
  };
  const url = `${siteUrl()}/inscription?parrain=${code.data}`;
  const days = settings.referral_bonus_days;

  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">Parrainage</p>
        <h1 className="title small">Invite tes camarades</h1>
        <p className="lead">
          {settings.referral_discount_cents > 0
            ? `Avec ton lien, ils ont ${formatEuros(settings.referral_discount_cents)} de réduction sur leur premier pass.`
            : "Partage ton lien d’invitation."}{" "}
          {days > 0
            ? `Toi, tu reçois ${days} jour${days > 1 ? "s" : ""} d’accès offerts dès que leur paiement est confirmé.`
            : ""}
        </p>
        <ShareLink url={url} />
      </section>

      <section className="paper pad" aria-labelledby="parrainage-bilan">
        <h2 id="parrainage-bilan" style={{ marginTop: 0, fontSize: "1.1rem" }}>
          Ton parrainage
        </h2>
        <div className="stats-grid">
          <div className="stat">
            <b>{mine.invited}</b>
            <span>
              compte{mine.invited > 1 ? "s" : ""} créé{mine.invited > 1 ? "s" : ""} avec ton lien
            </span>
          </div>
          <div className="stat">
            <b>{mine.rewarded}</b>
            <span>
              premier{mine.rewarded > 1 ? "s" : ""} achat{mine.rewarded > 1 ? "s" : ""} confirmé
              {mine.rewarded > 1 ? "s" : ""}
            </span>
          </div>
          <div className="stat">
            <b>{mine.bonus_days}</b>
            <span>
              jour{mine.bonus_days > 1 ? "s" : ""} offert{mine.bonus_days > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <p className="fine" style={{ marginTop: 12 }}>
          Les jours offerts prennent la suite de ton accès en cours et apparaissent sur la page{" "}
          <Link href="/compte">Compte</Link>.
        </p>
      </section>

      <section className="paper soon" aria-labelledby="parrainage-conditions">
        <h2 id="parrainage-conditions">Conditions</h2>
        <ul>
          <li>La réduction s&rsquo;applique au premier achat d&rsquo;un compte créé avec ton lien.</li>
          <li>
            Jours offerts dans la limite de {settings.referral_max_per_year} parrainage
            {settings.referral_max_per_year > 1 ? "s" : ""} récompensé
            {settings.referral_max_per_year > 1 ? "s" : ""} par an ; ils sont retirés si l&rsquo;achat est
            remboursé.
          </li>
          <li>Rien n&rsquo;est accordé entre des comptes utilisés sur le même appareil.</li>
        </ul>
        <p>
          Détails dans les <Link href="/cgv">conditions générales de vente</Link>.
        </p>
      </section>
    </>
  );
}
