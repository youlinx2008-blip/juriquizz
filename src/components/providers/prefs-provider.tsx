"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { savePrefsAction } from "@/app/actions/prefs";
import type { Prefs } from "@/lib/prefs";
import { getPrefs, getServerPrefs, setPrefs, subscribePrefs } from "./prefs-store";

type PrefsContextValue = {
  prefs: Prefs;
  /** Change un réglage ; pour un compte, il est aussi enregistré dans le profil. */
  updatePrefs: (patch: Partial<Prefs>) => void;
};

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({
  children,
  signedIn,
  profilePrefs,
}: {
  children: React.ReactNode;
  signedIn: boolean;
  /** Réglages déjà enregistrés dans le profil : ils priment sur ceux de l'appareil. */
  profilePrefs: Partial<Prefs> | null;
}) {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs, getServerPrefs);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const unsaved = useRef<Prefs | null>(null);
  const profileKey = JSON.stringify(profilePrefs ?? {});

  useEffect(() => {
    const fromProfile = JSON.parse(profileKey) as Partial<Prefs>;
    if (Object.keys(fromProfile).length) setPrefs(fromProfile);
    else setPrefs({});
  }, [profileKey]);

  const flush = useCallback(() => {
    clearTimeout(saveTimer.current);
    const pending = unsaved.current;
    unsaved.current = null;
    if (pending) void savePrefsAction(pending);
  }, []);

  // Un réglage en attente part quand on quitte la page.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  const updatePrefs = useCallback(
    (patch: Partial<Prefs>) => {
      const next = setPrefs(patch);
      if (!signedIn) return;
      unsaved.current = next;
      clearTimeout(saveTimer.current);
      // Le volume bouge en continu : on attend que le curseur s'arrête. Le reste part tout de suite.
      if (Object.keys(patch).every((key) => key === "volume")) saveTimer.current = setTimeout(flush, 600);
      else flush();
    },
    [signedIn, flush],
  );

  const value = useMemo(() => ({ prefs, updatePrefs }), [prefs, updatePrefs]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs doit être utilisé dans PrefsProvider");
  return value;
}
