"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { DecorKey } from "@/lib/decors/registry";
import { renderScene } from "@/lib/decors/scenes";
import { usePrefs } from "./providers/prefs-provider";
import { useScene } from "./providers/scene-provider";

const FADE_MS = 1200;

/**
 * Décor animé en arrière-plan. Seuls le décor affiché et, pendant le fondu, le précédent
 * sont présents dans la page : un téléphone modeste n'anime pas sept scènes à la fois.
 */
export function DecorStage() {
  const { decor } = useScene();
  const { prefs } = usePrefs();
  const off = prefs.decor === "off";
  const [layers, setLayers] = useState<DecorKey[]>([]);
  const [active, setActive] = useState<DecorKey | null>(null);

  useEffect(() => {
    if (off) return;
    let frame = requestAnimationFrame(() => {
      setLayers((previous) => (previous.includes(decor) ? previous : [...previous.slice(-1), decor]));
      // Deux images plus tard, la nouvelle couche est en place : le fondu peut commencer.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setActive(decor));
      });
    });
    const cleanup = setTimeout(
      () => setLayers((previous) => previous.filter((key) => key === decor)),
      FADE_MS + 300,
    );
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(cleanup);
    };
  }, [decor, off]);

  if (off) return null;
  return (
    <div className="scenes" aria-hidden="true">
      {layers.map((key) => (
        <SceneLayer key={key} decorKey={key} on={key === active} />
      ))}
      <div className="grain" />
    </div>
  );
}

const SceneLayer = memo(function SceneLayer({ decorKey, on }: { decorKey: DecorKey; on: boolean }) {
  const html = useMemo(() => {
    const markup = renderScene(decorKey);
    return { __html: markup.svg + markup.particles };
  }, [decorKey]);
  return (
    <div
      className={`scene sc-${decorKey}${on ? " on" : ""}`}
      data-decor-layer={decorKey}
      dangerouslySetInnerHTML={html}
    />
  );
});
