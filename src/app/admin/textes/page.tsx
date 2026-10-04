import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageForm } from "@/components/admin/sales-forms";
import { SceneSetter } from "@/components/scene-setter";
import { formatDayTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Textes légaux" };

const ORDER = ["mentions-legales", "cgu", "cgv", "confidentialite"];

export default async function AdminLegalPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("legal_pages").select("slug, title, body, version, updated_at");
  if (error) throw new Error(error.message);
  const pages = (data ?? []).sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));

  return (
    <>
      <SceneSetter decor="chateau" />
      <section className="paper pad">
        <h1 className="title small">Textes légaux</h1>
        <p className="lead">
          Brouillons à compléter et à faire valider. La vente ouvre quand plus aucun passage « [À COMPLÉTER »
          ne subsiste dans les quatre textes. Chaque enregistrement crée une nouvelle version ; les anciennes
          restent consultables (les achats mentionnent la version des CGV acceptée). Une nouvelle version des
          CGU est proposée aux utilisateurs à leur connexion suivante.
        </p>
      </section>
      {pages.map((page) => {
        const remaining = (page.body.match(/\[À COMPLÉTER/g) ?? []).length;
        return (
          <section className="paper pad" key={page.slug} aria-labelledby={`texte-${page.slug}`}>
            <h2 id={`texte-${page.slug}`} style={{ marginTop: 0 }}>
              {page.title}
            </h2>
            <p className="fine" style={{ marginBottom: 12 }}>
              Version {page.version}, {formatDayTime(page.updated_at)} ·{" "}
              {remaining ? (
                <span className="rate-low">
                  {remaining} passage{remaining > 1 ? "s" : ""} à compléter
                </span>
              ) : (
                "complet"
              )}{" "}
              · <Link href={`/${page.slug}`}>Voir la page</Link>
            </p>
            <details>
              <summary>Modifier</summary>
              <div style={{ marginTop: 12 }}>
                <LegalPageForm slug={page.slug} title={page.title} body={page.body} />
              </div>
            </details>
          </section>
        );
      })}
    </>
  );
}
