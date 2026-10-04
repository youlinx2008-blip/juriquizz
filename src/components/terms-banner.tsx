import Link from "next/link";
import { acceptTermsAction } from "@/app/actions/auth";
import type { Viewer } from "@/lib/auth";

/** Nouvelle version des CGU : proposée à l'utilisateur à sa connexion suivante. */
export function TermsBanner({ viewer }: { viewer: Viewer | null }) {
  if (!viewer?.cguVersion || (viewer.termsVersion ?? 0) >= viewer.cguVersion) return null;
  return (
    <section className="paper pad terms-banner" aria-labelledby="cgu-maj">
      <p id="cgu-maj" style={{ margin: 0 }}>
        Les conditions générales d&rsquo;utilisation ont été mises à jour.{" "}
        <Link href="/cgu">Lire les conditions</Link>
      </p>
      <form action={acceptTermsAction}>
        <input type="hidden" name="version" value={viewer.cguVersion} />
        <button className="btn small primary" type="submit">
          J&rsquo;accepte
        </button>
      </form>
    </section>
  );
}
