import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";

export const metadata: Metadata = { title: "Conditions générales d’utilisation" };

export default async function LegalPage({ searchParams }: PageProps<"/cgu">) {
  const { version } = await searchParams;
  return <LegalDocument slug="cgu" version={version} />;
}
