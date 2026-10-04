import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SceneSetter } from "@/components/scene-setter";
import { AutoRefresh } from "@/components/sales/auto-refresh";
import { requireViewer } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { planName } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Paiement" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ThanksPage({ searchParams }: PageProps<"/paiement/merci">) {
  const { achat } = await searchParams;
  if (typeof achat !== "string" || !UUID.test(achat)) notFound();
  await requireViewer(`/paiement/merci?achat=${achat}`);
  const supabase = await createClient();
  // La RLS ne laisse voir que ses propres achats.
  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, plan, status, amount_cents, quoted_ends_at, refunded_at")
    .eq("id", achat)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) notFound();
  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("ends_at")
    .eq("payment_id", payment.id)
    .maybeSingle();
  const name = planName(payment.plan);

  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <p className="course">
          {name}, {formatEuros(payment.amount_cents)}
        </p>
        {payment.status === "paye" ? (
          <>
            <h1 className="title small">Merci, ton accès est ouvert</h1>
            <p className="lead">
              Ton {name} est actif jusqu&rsquo;au{" "}
              <strong>{formatDay(entitlement?.ends_at ?? payment.quoted_ends_at)}</strong> inclus. Il ne sera
              pas renouvelé : rien ne sera prélevé après cette date.
            </p>
            <p className="fine" style={{ marginTop: 10 }}>
              Le reçu de paiement est envoyé à ton adresse e-mail. Tes achats restent consultables sur la page{" "}
              <Link href="/compte#achats">Compte</Link>.
            </p>
            <div className="actions">
              <Link className="btn primary" href="/cours">
                Commencer à réviser
              </Link>
            </div>
          </>
        ) : payment.status === "cree" ? (
          <>
            <h1 className="title small">Paiement en cours de confirmation</h1>
            <p className="lead" role="status">
              Stripe confirme ton paiement ; ton accès s&rsquo;ouvre dans quelques secondes. Cette page se met
              à jour d&rsquo;elle-même.
            </p>
            <AutoRefresh everyMs={3000} maxTimes={20} />
            <div className="actions">
              <Link className="btn" href={`/paiement/merci?achat=${payment.id}`}>
                Actualiser
              </Link>
            </div>
          </>
        ) : payment.status === "rembourse" ? (
          <>
            <h1 className="title small">Achat remboursé</h1>
            <p className="lead">
              Cet achat a été remboursé
              {payment.refunded_at ? ` le ${formatDay(payment.refunded_at)}` : ""} ; l&rsquo;accès
              correspondant est fermé.
            </p>
          </>
        ) : (
          <>
            <h1 className="title small">Paiement non abouti</h1>
            <p className="lead">
              La page de paiement a expiré avant la fin du paiement : aucun montant n&rsquo;a été débité.
            </p>
            <div className="actions">
              <Link className="btn primary" href="/tarifs">
                Voir les pass
              </Link>
            </div>
          </>
        )}
      </section>
    </>
  );
}
