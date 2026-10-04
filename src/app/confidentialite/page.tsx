import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default async function LegalPage({ searchParams }: PageProps<"/confidentialite">) {
  const { version } = await searchParams;
  return <LegalDocument slug="confidentialite" version={version} />;
}
