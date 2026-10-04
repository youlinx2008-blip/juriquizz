"use client";

import { useEffect } from "react";
import type { DecorKey } from "@/lib/decors/registry";
import { InlineScript } from "./inline-script";
import { useNonce } from "./providers/nonce-provider";
import { useScene } from "./providers/scene-provider";

/** Choisit le décor d'une page. Au premier chargement, la couleur d'accent est posée tout de suite. */
export function SceneSetter({ decor }: { decor: DecorKey }) {
  const { setDecor } = useScene();
  const nonce = useNonce();
  useEffect(() => {
    setDecor(decor);
  }, [decor, setDecor]);
  return (
    <InlineScript
      html={`document.documentElement.setAttribute("data-scene",${JSON.stringify(decor)})`}
      nonce={nonce}
    />
  );
}
