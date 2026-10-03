import { redirect } from "next/navigation";

export default async function SubjectPage({ params }: PageProps<"/cours/[matiere]">) {
  const { matiere } = await params;
  redirect(`/cours#${encodeURIComponent(matiere)}`);
}
