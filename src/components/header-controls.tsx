"use client";

import { DECOR_MODE_LABELS, type DecorMode } from "@/lib/prefs";
import { usePrefs } from "./providers/prefs-provider";
import { useSound } from "./providers/sound-provider";

const NEXT_MODE: Record<DecorMode, DecorMode> = { anime: "fixe", fixe: "off", off: "anime" };

/** Son activé / coupé, volume et mode du décor, toujours à portée de main. */
export function HeaderControls() {
  const { prefs, updatePrefs } = usePrefs();
  const sound = useSound();
  const soundOn = prefs.sound === "on";
  return (
    <div className="ctrls">
      {sound.supported && (
        <>
          <button className="chip" type="button" aria-pressed={soundOn} onClick={sound.toggle}>
            {soundOn ? "Son activé" : "Son coupé"}
          </button>
          <input
            className="vol"
            type="range"
            min={0}
            max={100}
            value={Math.round(prefs.volume * 100)}
            aria-label="Volume du son"
            disabled={!soundOn}
            onChange={(event) => updatePrefs({ volume: Number(event.target.value) / 100 })}
          />
        </>
      )}
      <button
        className="chip"
        type="button"
        aria-label={`${DECOR_MODE_LABELS[prefs.decor]}, changer le mode du décor`}
        onClick={() => updatePrefs({ decor: NEXT_MODE[prefs.decor] })}
      >
        {DECOR_MODE_LABELS[prefs.decor]}
      </button>
    </div>
  );
}
