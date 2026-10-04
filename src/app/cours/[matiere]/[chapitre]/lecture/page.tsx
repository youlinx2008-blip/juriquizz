import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FullNameForm } from "@/app/compte/account-forms";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { SceneSetter } from "@/components/scene-setter";
import { requireAccess } from "@/lib/auth";
import { getChapter } from "@/lib/data/catalog";
import { getDocument } from "@/lib/data/documents";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/cours/[matiere]/[chapitre]/lecture">): Promise<Metadata> {
  const { matiere, chapitre } = await params;
  const found = await getChapter(await createClient(), matiere, chapitre).catch(() => null);
  return { title: found ? `Cours : ${found.chapter.title}` : "Cours", robots: { index: false } };
}

export default async function ReadingPage({ params }: PageProps<"/cours/[matiere]/[chapitre]/lecture">) {
  const { matiere, chapitre } = await params;
  const path = `/cours/${matiere}/${chapitre}/lecture`;
  const viewer = await requireAccess(path);
  const supabase = await createClient();
  const found = await getChapter(supabase, matiere, chapitre);
  if (!found) notFound();
  const { subject, chapter } = found;
  // Exclusivité Premium : la page du chapitre présente l'offre.
  if (chapter.premium && !viewer.hasPremium) redirect(`/cours/${subject.slug}/${chapter.slug}`);
  const document = await getDocument(supabase, chapter.id);
  if (!document) notFound();

  return (
    <>
      <SceneSetter decor={chapter.defaultDecor} />
      <section className="paper pad">
        <Link className="chip" href={`/cours/${subject.slug}/${chapter.slug}`}>
          Retour au chapitre
        </Link>
        <p className="course" style={{ marginTop: 14 }}>
          {chapter.number === "0" ? subject.title : `${subject.title}, ${chapter.label}`} · cours en PDF
        </p>
        <h1 className="title small">{document.title || chapter.title}</h1>
        {viewer.fullName ? (
          <p className="fine">
            Exemplaire personnel : ton nom et ton adresse e-mail figurent sur chaque page. Le cours se lit ici
            ; sa diffusion est interdite.
          </p>
        ) : (
          <>
            <p className="lead" style={{ marginBottom: 14 }}>
              Avant d&rsquo;ouvrir les cours : chaque page porte, en filigrane, le nom et l&rsquo;adresse
              e-mail de son lecteur.
            </p>
            <FullNameForm initial="" next={path} />
          </>
        )}
      </section>
      {viewer.fullName && (
        <section className="paper pad">
          <PdfViewer src={`/api/cours/${document.id}`} label={`Cours : ${document.title || chapter.title}`} />
        </section>
      )}
    </>
  );
}
