import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { SceneSetter } from "@/components/scene-setter";
import { getViewer } from "@/lib/auth";
import { getChapter } from "@/lib/data/catalog";
import { getDocument } from "@/lib/data/documents";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/apercu/[matiere]/[chapitre]">): Promise<Metadata> {
  const { matiere, chapitre } = await params;
  const found = await getChapter(await createClient(), matiere, chapitre).catch(() => null);
  return { title: found ? `Aperçu : ${found.chapter.title}` : "Aperçu" };
}

/** Aperçu gratuit d'un cours en PDF : couverture et sommaire, pour tous les visiteurs. */
export default async function PreviewPage({ params }: PageProps<"/apercu/[matiere]/[chapitre]">) {
  const { matiere, chapitre } = await params;
  const supabase = await createClient();
  const [viewer, found] = await Promise.all([getViewer(), getChapter(supabase, matiere, chapitre)]);
  if (!found) notFound();
  const { subject, chapter } = found;
  const document = await getDocument(supabase, chapter.id);
  if (!document || document.previewPages === 0) notFound();
  const shown = Math.min(document.previewPages, document.pageCount);

  return (
    <>
      <SceneSetter decor={chapter.defaultDecor} />
      <section className="paper pad">
        <p className="course">
          {chapter.number === "0" ? subject.title : `${subject.title}, ${chapter.label}`} · aperçu gratuit
        </p>
        <h1 className="title small">{document.title || chapter.title}</h1>
        <p className="lead">
          {shown === 1 ? "La première page" : `Les ${shown} premières pages`} du cours, sur{" "}
          {document.pageCount}. Le cours complet est réservé aux détenteurs d&rsquo;un pass ; chaque
          exemplaire porte le nom de son lecteur.
        </p>
        <div className="actions">
          {viewer?.hasAccess ? (
            <Link className="btn primary" href={`/cours/${subject.slug}/${chapter.slug}/lecture`}>
              Lire le cours complet
            </Link>
          ) : (
            <>
              <Link className="btn primary" href="/tarifs">
                Voir les pass
              </Link>
              {!viewer && (
                <Link className="btn" href="/inscription">
                  Créer un compte gratuit
                </Link>
              )}
            </>
          )}
        </div>
      </section>
      <section className="paper pad">
        <PdfViewer
          src={`/api/apercu/${document.id}`}
          label={`Aperçu du cours : ${document.title || chapter.title}`}
        />
      </section>
    </>
  );
}
