import Link from "next/link";
import { SceneSetter } from "@/components/scene-setter";
import { formatEuros } from "@/lib/money";
import { getSalesStatus } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";

type Overview = {
  users: number;
  active_testers: number;
  active_passes: number;
  sales_count: number;
  sales_cents: number;
  demo_questions: number;
  legal_ready: boolean;
  attempts: number;
  attempts_7d: number;
  feedback_open: number;
  questions: Record<string, number>;
};

export default async function AdminHome() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) throw new Error(error.message);
  const overview = data as unknown as Overview;
  const questions = overview.questions ?? {};
  const sales = await getSalesStatus(supabase);
  return (
    <>
      <SceneSetter decor="chateau" />
      <section className="paper pad">
        <p className="course">Administration</p>
        <h1 className="title small">Vue d&rsquo;ensemble</h1>
        <div className="stats-grid">
          <div className="stat">
            <b>{overview.users}</b>
            <span>comptes</span>
          </div>
          <div className="stat">
            <b>{overview.active_testers}</b>
            <span>testeurs bêta actifs</span>
          </div>
          <div className="stat">
            <b>{overview.active_passes}</b>
            <span>pass en cours</span>
          </div>
          <div className="stat">
            <b>{formatEuros(overview.sales_cents)}</b>
            <span>
              <Link href="/admin/achats">{overview.sales_count} achat(s) payé(s)</Link>
            </span>
          </div>
          <div className="stat">
            <b>{sales.open ? "Ouverte" : "Fermée"}</b>
            <span>
              <Link href="/admin/vente">vente</Link>
            </span>
          </div>
          <div className="stat">
            <b>{overview.demo_questions}</b>
            <span>
              <Link href="/admin/questions?demo=1">questions de démonstration</Link>
            </span>
          </div>
          <div className="stat">
            <b>{overview.attempts}</b>
            <span>parties jouées ({overview.attempts_7d} sur 7 jours)</span>
          </div>
          <div className="stat">
            <b>{overview.feedback_open}</b>
            <span>
              <Link href="/admin/retours">retours à traiter</Link>
            </span>
          </div>
          <div className="stat">
            <b>{questions.a_relire ?? 0}</b>
            <span>
              <Link href="/admin/questions?statut=a_relire">questions à relire</Link>
            </span>
          </div>
          <div className="stat">
            <b>{questions.relue ?? 0}</b>
            <span>questions relues</span>
          </div>
          <div className="stat">
            <b>{questions.a_corriger ?? 0}</b>
            <span>
              <Link href="/admin/questions?statut=a_corriger">questions à corriger</Link>
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
