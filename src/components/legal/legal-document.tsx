import Markdown from "react-markdown";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SceneSetter } from "@/components/scene-setter";
import { formatDay } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type LegalSlug = "cgu" | "cgv" | "mentions-legales" | "confidentialite";

/**
 * Texte légal tel qu'enregistré dans l'administration (Markdown, sans HTML). `version` : une version
 * antérieure, par exemple les CGV acceptées lors d'un achat.
 */
export async function LegalDocument({ slug, version }: { slug: LegalSlug; version?: string | string[] }) {
  const supabase = await createClient();
  const { data: current, error } = await supabase
    .from("legal_pages")
    .select("title, body, version, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!current) notFound();

  let shown = {
    title: current.title,
    body: current.body,
    version: current.version,
    date: current.updated_at,
  };
  const wanted = typeof version === "string" && /^\d{1,6}$/.test(version) ? Number(version) : null;
  if (wanted !== null && wanted !== current.version) {
    const { data: past } = await supabase
      .from("legal_page_versions")
      .select("title, body, version, created_at")
      .eq("slug", slug)
      .eq("version", wanted)
      .maybeSingle();
    if (!past) notFound();
    shown = { title: past.title, body: past.body, version: past.version, date: past.created_at };
  }
  const outdated = shown.version !== current.version;
  const draft = shown.body.includes("[À COMPLÉTER");

  return (
    <>
      <SceneSetter decor="codex" />
      <article className="paper pad prose legal">
        <p className="course">
          Version {shown.version} du {formatDay(shown.date)}
          {outdated ? " (ancienne version)" : ""}
        </p>
        <h1 className="title small">{shown.title}</h1>
        {outdated && (
          <p className="notice" role="status">
            Version antérieure, conservée pour mémoire.{" "}
            <Link href={`/${slug}`}>Lire la version en vigueur</Link>
          </p>
        )}
        {draft && (
          <p className="notice warn" role="status">
            Texte en cours de rédaction : les passages entre crochets restent à compléter.
          </p>
        )}
        <Markdown>{shown.body}</Markdown>
      </article>
    </>
  );
}
