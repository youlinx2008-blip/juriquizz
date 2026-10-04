import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import { BrandMark } from "./emblem";
import { HeaderControls } from "./header-controls";
import { NavLink } from "./nav-link";

export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  return (
    <header className="top">
      <Link className="brand" href={viewer?.hasAccess ? "/cours" : "/"}>
        <BrandMark />
        <span>JuriQuizz</span>
      </Link>
      <nav className="nav" aria-label="Navigation principale">
        {viewer?.hasAccess ? (
          <>
            <NavLink href="/cours">Cours</NavLink>
            {(viewer.hasExams || viewer.isAdmin) && <NavLink href="/examens">Examens</NavLink>}
            <NavLink href="/progression">Progression</NavLink>
            <NavLink href="/compte">Compte</NavLink>
          </>
        ) : viewer ? (
          <>
            <NavLink href="/demo">Démo</NavLink>
            <NavLink href="/tarifs">Tarifs</NavLink>
            <NavLink href="/compte">Compte</NavLink>
          </>
        ) : (
          <>
            <NavLink href="/tarifs">Tarifs</NavLink>
            <NavLink href="/connexion">Connexion</NavLink>
            <NavLink href="/inscription">Créer un compte</NavLink>
          </>
        )}
        {viewer?.isAdmin && <NavLink href="/admin">Admin</NavLink>}
      </nav>
      <HeaderControls />
    </header>
  );
}
