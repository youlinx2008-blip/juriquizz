"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { HOME_DECOR, type DecorKey } from "@/lib/decors/registry";

type SceneContextValue = {
  decor: DecorKey;
  setDecor: (decor: DecorKey) => void;
};

const SceneContext = createContext<SceneContextValue | null>(null);

/** Décor courant : il change avec la page, le chapitre et la question. */
export function SceneProvider({ children }: { children: React.ReactNode }) {
  const [decor, setDecor] = useState<DecorKey>(HOME_DECOR);

  useEffect(() => {
    // L'accent de l'interface suit le décor.
    document.documentElement.setAttribute("data-scene", decor);
  }, [decor]);

  const value = useMemo(() => ({ decor, setDecor }), [decor]);
  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
}

export function useScene(): SceneContextValue {
  const value = useContext(SceneContext);
  if (!value) throw new Error("useScene doit être utilisé dans SceneProvider");
  return value;
}
