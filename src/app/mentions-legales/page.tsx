import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = { title: "Mentions légales" };

export default async function LegalPage({ searchParams }: PageProps<"/mentions-legales">) {
  const { version } = await searchParams;
  return <LegalDocument slug="mentions-legales" version={version} />;
}
