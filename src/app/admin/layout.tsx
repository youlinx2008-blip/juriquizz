import type { Metadata } from "next";
import { NavLink } from "@/components/nav-link";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration · JuriQuizz" },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="stack">
      <nav
        className="paper pad nav"
        aria-label="Administration"
        style={{ paddingTop: 12, paddingBottom: 12 }}
      >
        <NavLink href="/admin/questions">Questions</NavLink>
        <NavLink href="/admin/matieres">Matières</NavLink>
        <NavLink href="/admin/cours">Cours PDF</NavLink>
        <NavLink href="/admin/vente">Vente</NavLink>
        <NavLink href="/admin/achats">Achats</NavLink>
        <NavLink href="/admin/textes">Textes légaux</NavLink>
        <NavLink href="/admin/codes">Codes bêta</NavLink>
        <NavLink href="/admin/retours">Retours</NavLink>
      </nav>
      {children}
    </div>
  );
}
