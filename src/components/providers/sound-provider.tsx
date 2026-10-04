"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { getAmbientSound, type SoundEffect } from "@/lib/sound/ambient";
import { usePrefs } from "./prefs-provider";
import { useScene } from "./scene-provider";

type SoundContextValue = {
  /** Faux si le navigateur ne sait pas produire de son (les réglages sont alors masqués). */
  supported: boolean;
  toggle: () => void;
  fx: (kind: SoundEffect) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

function subscribeNothing(): () => void {
  return () => {};
}

function isSoundSupported(): boolean {
  return getAmbientSound().supported;
}

/**
 * Pilote le son d'ambiance : il démarre au premier geste (règle des navigateurs), suit le
 * décor et le volume, et se met en pause quand l'onglet est masqué.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const { prefs, updatePrefs } = usePrefs();
  const { decor } = useScene();
  // Le rendu serveur suppose le son disponible ; le navigateur dit ce qu'il en est.
  const supported = useSyncExternalStore(subscribeNothing, isSoundSupported, () => true);

  useEffect(() => {
    getAmbientSound().volume(prefs.volume);
  }, [prefs.volume]);

  useEffect(() => {
    getAmbientSound().theme(decor);
  }, [decor]);

  useEffect(() => {
    const engine = getAmbientSound();
    if (!engine.supported) return;
    if (prefs.sound === "off") {
      engine.stop();
      return;
    }
    if (engine.isPlaying()) return;
    const events = ["click", "keydown", "touchend"] as const;
    const start = () => {
      events.forEach((type) => document.removeEventListener(type, start, true));
      if (!engine.isPlaying()) engine.start();
    };
    events.forEach((type) => document.addEventListener(type, start, true));
    return () => events.forEach((type) => document.removeEventListener(type, start, true));
  }, [prefs.sound]);

  useEffect(() => {
    const engine = getAmbientSound();
    const onVisibility = () => (document.hidden ? engine.pause() : engine.resume());
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const toggle = useCallback(() => {
    const engine = getAmbientSound();
    // Appelé dans le gestionnaire du clic : le navigateur autorise alors le démarrage.
    if (prefs.sound === "on") {
      engine.stop();
      updatePrefs({ sound: "off" });
    } else {
      engine.start();
      updatePrefs({ sound: "on" });
    }
  }, [prefs.sound, updatePrefs]);

  const fx = useCallback((kind: SoundEffect) => getAmbientSound().fx(kind), []);

  const value = useMemo(() => ({ supported, toggle, fx }), [supported, toggle, fx]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const value = useContext(SoundContext);
  if (!value) throw new Error("useSound doit être utilisé dans SoundProvider");
  return value;
}
