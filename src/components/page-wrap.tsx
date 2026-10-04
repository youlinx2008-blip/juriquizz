"use client";

import { usePathname } from "next/navigation";

/** Colonne de lecture ; plus large pour les tableaux de l'administration. */
export function PageWrap({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className={pathname.startsWith("/admin") ? "wrap wide" : "wrap"}>{children}</div>;
}
