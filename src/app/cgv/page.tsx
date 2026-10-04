import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default async function LegalPage({ searchParams }: PageProps<"/cgv">) {
  const { version } = await searchParams;
  return <LegalDocument slug="cgv" version={version} />;
}
