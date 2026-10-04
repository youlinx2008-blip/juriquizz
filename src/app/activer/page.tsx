import { redirect } from "next/navigation";

/** Ancienne adresse de la page d'activation (liens de la bêta) : elle mène à « Mon accès ». */
export default async function ActivatePage({ searchParams }: PageProps<"/activer">) {
  const { suite } = await searchParams;
  redirect(typeof suite === "string" ? `/acces?suite=${encodeURIComponent(suite)}` : "/acces");
}
