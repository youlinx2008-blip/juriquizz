import type { Metadata } from "next";
import { SceneSetter } from "@/components/scene-setter";
import { formatDay, formatDayTime } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { planName } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Achats" };

const STATUS: Record<string, string> = {
  cree: "Paiement en cours",
  paye: "Payé",
  rembourse: "Remboursé",
  expire: "Abandonné",
};

const DISCOUNTS: Record<string, string> = {
  parrainage: "parrainage",
  passage_premium: "Pass Année déduit",
};

export default async function AdminPurchasesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_payments", { p_limit: 300 });
  if (error) throw new Error(error.message);
  const payments = data ?? [];
  const paid = payments.filter((payment) => payment.status === "paye");
  const total = paid.reduce((sum, payment) => sum + payment.amount_cents, 0);

  return (
    <>
      <SceneSetter decor="chateau" />
      <section className="paper pad">
        <h1 className="title small">Achats</h1>
        <p className="lead">
          Les 300 derniers achats. Les remboursements se font depuis le tableau de bord Stripe : l&rsquo;accès
          correspondant se ferme dès que Stripe le signale. Un remboursement partiel laisse l&rsquo;accès
          ouvert.
        </p>
        <div className="stats-grid" style={{ marginTop: 14 }}>
          <div className="stat">
            <b>{paid.length}</b>
            <span>achats payés (dans la liste)</span>
          </div>
          <div className="stat">
            <b>{formatEuros(total)}</b>
            <span>encaissés (dans la liste)</span>
          </div>
        </div>
      </section>
      <section className="paper pad" aria-label="Liste des achats">
        {payments.length === 0 ? (
          <p style={{ margin: 0 }}>Aucun achat pour l&rsquo;instant.</p>
        ) : (
          <div className="table-wrap" role="region" aria-label="Liste des achats" tabIndex={0}>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Compte</th>
                  <th scope="col">Pass</th>
                  <th scope="col">Montant</th>
                  <th scope="col">Réduction</th>
                  <th scope="col">État</th>
                  <th scope="col">Fin de l&rsquo;accès</th>
                  <th scope="col">Référence Stripe</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.payment_id}>
                    <td className="num-cell">{formatDayTime(payment.paid_at ?? payment.created_at)}</td>
                    <td>{payment.email ?? <em>compte supprimé</em>}</td>
                    <td>{planName(payment.plan)}</td>
                    <td className="num-cell">{formatEuros(payment.amount_cents)}</td>
                    <td className="num-cell">
                      {payment.discount_cents
                        ? `−${formatEuros(payment.discount_cents)} (${DISCOUNTS[payment.discount_reason ?? ""] ?? "réduction"})`
                        : "–"}
                    </td>
                    <td>
                      {STATUS[payment.status] ?? payment.status}
                      {payment.refunded_at ? ` le ${formatDay(payment.refunded_at)}` : ""}
                    </td>
                    <td className="num-cell">{payment.ends_at ? formatDay(payment.ends_at) : "–"}</td>
                    <td style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>
                      {payment.stripe_payment_intent ?? "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
