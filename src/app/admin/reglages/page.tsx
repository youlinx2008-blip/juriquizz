import type { Metadata } from "next";
import Link from "next/link";
import { GrowthSettingsForm } from "@/components/admin/sales-forms";
import { SceneSetter } from "@/components/scene-setter";
import {
  mentions,
  PREMIUM_CLAUSE,
  PRIVACY_EXAMS_CLAUSE,
  PRIVACY_REFERRAL_CLAUSE,
  referralClause,
} from "@/lib/legal-clauses";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Réglages" };

function euros(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const [settingsResult, cgvResult, premiumResult] = await Promise.all([
    supabase
      .from("settings")
      .select(
        "levels_unlock, referral_enabled, referral_discount_cents, referral_bonus_days, referral_max_per_year",
      )
      .maybeSingle(),
    supabase.from("legal_pages").select("body").eq("slug", "cgv").maybeSingle(),
    supabase.from("plans").select("on_sale").eq("id", "pass_annee_premium").maybeSingle(),
  ]);
  const [privacyResult, examsResult] = await Promise.all([
    supabase.from("legal_pages").select("body").eq("slug", "confidentialite").maybeSingle(),
    supabase.from("mock_exams").select("id", { count: "exact", head: true }).eq("visible", true),
  ]);
  const privacy = privacyResult.data?.body ?? "";
  const examsOffered = (examsResult.count ?? 0) > 0;
  if (settingsResult.error) throw new Error(settingsResult.error.message);
  const settings = settingsResult.data;
  if (!settings) throw new Error("Réglages introuvables.");
  const cgv = cgvResult.data?.body ?? "";
  const referral = {
    discountCents: settings.referral_discount_cents,
    bonusDays: settings.referral_bonus_days,
    maxPerYear: settings.referral_max_per_year,
  };

  return (
    <>
      <SceneSetter decor="chateau" />
      <section className="paper pad">
        <h1 className="title small">Réglages</h1>
        <p className="lead">
          Déblocage progressif des niveaux et parrainage, et ce qu&rsquo;ils demandent d&rsquo;ajouter aux
          textes légaux. Les changements s&rsquo;appliquent immédiatement.
        </p>
      </section>

      <section className="paper pad" aria-labelledby="reglages-croissance">
        <h2 id="reglages-croissance" style={{ marginTop: 0 }}>
          Niveaux et parrainage
        </h2>
        <p className="fine" style={{ marginBottom: 12 }}>
          Parrainage : chaque compte reçoit un lien personnel. Le filleul obtient une réduction sur son
          premier achat ; une fois ce paiement confirmé, le parrain reçoit des jours d&rsquo;accès offerts, à
          la suite de son accès en cours (rien entre deux comptes utilisés sur le même appareil, retiré si
          l&rsquo;achat est remboursé).
        </p>
        <GrowthSettingsForm
          settings={{
            levelsUnlock: settings.levels_unlock,
            referralEnabled: settings.referral_enabled,
            referralDiscount: euros(settings.referral_discount_cents),
            referralBonusDays: settings.referral_bonus_days,
            referralMaxPerYear: settings.referral_max_per_year,
          }}
        />
      </section>

      <section className="paper pad" aria-labelledby="reglages-cgv">
        <h2 id="reglages-cgv" style={{ marginTop: 0 }}>
          Conditions générales de vente
        </h2>
        <p className="fine" style={{ marginBottom: 12 }}>
          Les CGV ne sont jamais modifiées automatiquement. Avant d&rsquo;ouvrir le parrainage ou de mettre le
          Premium en vente, complète-les depuis la page <Link href="/admin/textes">Textes légaux</Link> ; les
          propositions ci-dessous sont à adapter et à faire relire.
        </p>
        {settings.referral_enabled && !mentions(cgv, "parrainage") && (
          <p className="notice warn" style={{ marginBottom: 12 }}>
            Le parrainage est ouvert, mais les CGV en vigueur n&rsquo;en parlent pas.
          </p>
        )}
        {premiumResult.data?.on_sale && !mentions(cgv, "premium") && (
          <p className="notice warn" style={{ marginBottom: 12 }}>
            Le Pass Année Premium est coché « En vente », mais les CGV en vigueur ne le mentionnent pas.
          </p>
        )}
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Clause proposée : parrainage</summary>
          <pre className="clause">{referralClause(referral)}</pre>
        </details>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Clause proposée : Pass Année Premium (article « Offres »)
          </summary>
          <pre className="clause">{PREMIUM_CLAUSE}</pre>
        </details>
      </section>

      <section className="paper pad" aria-labelledby="reglages-confidentialite">
        <h2 id="reglages-confidentialite" style={{ marginTop: 0 }}>
          Politique de confidentialité
        </h2>
        <p className="fine" style={{ marginBottom: 12 }}>
          Les examens blancs et le parrainage conservent de nouvelles données ; le parrainage réutilise
          l&rsquo;identifiant d&rsquo;appareil pour éviter les abus. À ajouter à la rubrique « Données
          conservées et finalités », depuis la page <Link href="/admin/textes">Textes légaux</Link>.
        </p>
        {examsOffered && !mentions(privacy, "examen") && (
          <p className="notice warn" style={{ marginBottom: 12 }}>
            Des examens blancs sont proposés, mais la politique de confidentialité n&rsquo;en parle pas.
          </p>
        )}
        {settings.referral_enabled && !mentions(privacy, "parrain") && (
          <p className="notice warn" style={{ marginBottom: 12 }}>
            Le parrainage est ouvert, mais la politique de confidentialité n&rsquo;en parle pas.
          </p>
        )}
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Rubrique proposée : examens blancs</summary>
          <pre className="clause">{PRIVACY_EXAMS_CLAUSE}</pre>
        </details>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Rubrique proposée : parrainage</summary>
          <pre className="clause">{PRIVACY_REFERRAL_CLAUSE}</pre>
        </details>
      </section>
    </>
  );
}
