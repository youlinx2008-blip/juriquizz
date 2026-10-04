import type { Metadata } from "next";
import Link from "next/link";
import { deleteCourseDocumentAction } from "@/app/actions/admin-cours";
import { CourseSettingsForm, CourseUploadForm } from "@/components/admin/course-forms";
import { SceneSetter } from "@/components/scene-setter";
import { getSubjects } from "@/lib/data/catalog";
import { formatSize, getDocuments } from "@/lib/data/documents";
import { daysAgo, formatDay } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { serviceConfigured } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Cours en PDF" };

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const subjects = await getSubjects(supabase);
  const documents = await getDocuments(
    supabase,
    subjects.flatMap((subject) => subject.chapters.map((chapter) => chapter.id)),
  );
  const { data: views } = await supabase
    .from("pdf_views")
    .select("document_id")
    .gte("viewed_at", daysAgo(30))
    .limit(20_000);
  const readings = new Map<string, number>();
  for (const view of views ?? []) readings.set(view.document_id, (readings.get(view.document_id) ?? 0) + 1);

  return (
    <>
      <SceneSetter decor="codex" />
      <section className="paper pad">
        <h1 className="title small">Cours en PDF</h1>
        <p className="lead">
          Un PDF par chapitre, fourni par l&rsquo;auteur et déposé tel quel : il reste dans un stockage privé.
          Chaque lecteur reçoit une copie portant son nom et son adresse e-mail sur chaque page. Les premières
          pages (couverture, sommaire) forment l&rsquo;aperçu gratuit.
        </p>
        {!serviceConfigured() && (
          <p className="notice warn" style={{ marginTop: 12 }}>
            La clé secrète Supabase (SUPABASE_SECRET_KEY) manque sur le serveur : les étudiants ne pourront
            pas ouvrir les cours.
          </p>
        )}
        <p className="fine" style={{ marginTop: 12 }}>
          Fichiers acceptés : PDF sans mot de passe ni restriction, 50 Mo au plus. Un fichier léger
          s&rsquo;ouvre plus vite sur téléphone.
        </p>
      </section>
      {subjects.map((subject) => (
        <section className="paper" key={subject.id} aria-labelledby={`cours-${subject.slug}`}>
          <div className="pad" style={{ paddingBottom: 8 }}>
            <h2 id={`cours-${subject.slug}`} style={{ margin: 0, fontFamily: "var(--serif)" }}>
              {subject.title}
            </h2>
            {!subject.visible && (
              <p className="notice warn">Matière masquée : ses cours ne sont pas lisibles.</p>
            )}
          </div>
          {subject.chapters.map((chapter) => {
            const document = documents.get(chapter.id);
            return (
              <div className="pad" key={chapter.id} style={{ borderTop: "1px solid var(--line)" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>
                  {chapter.number === "0" ? "" : `${chapter.label} : `}
                  {chapter.title}
                </h3>
                {document ? (
                  <div className="stack">
                    <p className="fine">
                      {document.pageCount} page{document.pageCount > 1 ? "s" : ""},{" "}
                      {formatSize(document.fileSize)}, déposé le {formatDay(document.uploadedAt)} ·{" "}
                      {readings.get(document.id) ?? 0} lecture(s) sur 30 jours ·{" "}
                      <Link href={`/cours/${subject.slug}/${chapter.slug}/lecture`}>Lire</Link>
                      {document.previewPages > 0 && (
                        <>
                          {" "}
                          · <Link href={`/apercu/${subject.slug}/${chapter.slug}`}>Aperçu</Link>
                        </>
                      )}
                    </p>
                    <CourseSettingsForm
                      chapterId={chapter.id}
                      title={document.title}
                      previewPages={document.previewPages}
                    />
                    <details>
                      <summary>Remplacer ou retirer ce cours</summary>
                      <div className="stack" style={{ marginTop: 12 }}>
                        <CourseUploadForm chapterId={chapter.id} defaultTitle={document.title} replacing />
                        <form action={deleteCourseDocumentAction}>
                          <input type="hidden" name="chapterId" value={chapter.id} />
                          <button className="btn danger small" type="submit">
                            Retirer ce cours
                          </button>
                        </form>
                      </div>
                    </details>
                  </div>
                ) : (
                  <CourseUploadForm chapterId={chapter.id} defaultTitle={chapter.title} replacing={false} />
                )}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
