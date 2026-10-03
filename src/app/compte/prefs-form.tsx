"use client";

import { usePrefs } from "@/components/providers/prefs-provider";
import { useSound } from "@/components/providers/sound-provider";
import { DECOR_MODE_LABELS, THEME_LABELS, type DecorMode, type ThemePref } from "@/lib/prefs";

/** Réglages appliqués tout de suite, et enregistrés dans le profil. */
export function PrefsForm() {
  const { prefs, updatePrefs } = usePrefs();
  const sound = useSound();
  return (
    <div className="form">
      {sound.supported && (
        <fieldset className="field">
          <legend>Son d&rsquo;ambiance</legend>
          <div className="radios">
            <label>
              <input
                type="radio"
                name="sound"
                checked={prefs.sound === "on"}
                onChange={() => prefs.sound !== "on" && sound.toggle()}
              />
              Activé (démarre au premier clic)
            </label>
            <label>
              <input
                type="radio"
                name="sound"
                checked={prefs.sound === "off"}
                onChange={() => prefs.sound !== "off" && sound.toggle()}
              />
              Coupé
            </label>
          </div>
          <label htmlFor="volume" style={{ marginTop: 8 }}>
            Volume : {Math.round(prefs.volume * 100)} %
          </label>
          <input
            id="volume"
            className="vol"
            style={{ width: "100%", maxWidth: 320 }}
            type="range"
            min={0}
            max={100}
            value={Math.round(prefs.volume * 100)}
            disabled={prefs.sound === "off"}
            onChange={(event) => updatePrefs({ volume: Number(event.target.value) / 100 })}
          />
        </fieldset>
      )}
      <fieldset className="field">
        <legend>Décor</legend>
        <div className="radios">
          {(Object.keys(DECOR_MODE_LABELS) as DecorMode[]).map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                name="decor"
                checked={prefs.decor === mode}
                onChange={() => updatePrefs({ decor: mode })}
              />
              {DECOR_MODE_LABELS[mode]}
            </label>
          ))}
        </div>
        <p className="help">Si ton appareil demande de réduire les animations, le décor reste fixe.</p>
      </fieldset>
      <fieldset className="field">
        <legend>Apparence</legend>
        <div className="radios">
          {(Object.keys(THEME_LABELS) as ThemePref[]).map((theme) => (
            <label key={theme}>
              <input
                type="radio"
                name="theme"
                checked={prefs.theme === theme}
                onChange={() => updatePrefs({ theme })}
              />
              {THEME_LABELS[theme]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
