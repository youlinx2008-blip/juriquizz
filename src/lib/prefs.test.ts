import { describe, expect, it } from "vitest";
import { defaultPrefs, prefsFromProfile, prefsToProfile, sanitizePrefs, themeAttribute } from "./prefs";

describe("préférences", () => {
  it("décor fixe par défaut si l'appareil demande moins d'animations", () => {
    expect(defaultPrefs(false).decor).toBe("anime");
    expect(defaultPrefs(true).decor).toBe("fixe");
    expect(defaultPrefs(false).sound).toBe("on");
  });

  it("répare des préférences abîmées", () => {
    expect(sanitizePrefs({ sound: "off", volume: 4, decor: "neon", theme: "sombre" }, false)).toEqual({
      sound: "off",
      volume: 0.35,
      decor: "anime",
      theme: "sombre",
    });
    expect(sanitizePrefs("n'importe quoi", true)).toEqual(defaultPrefs(true));
  });

  it("ne reprend du profil que les réglages déjà choisis", () => {
    expect(prefsFromProfile({ sound_pref: null, decor_pref: "off", theme_pref: null, volume: 0.6 })).toEqual({
      decor: "off",
      volume: 0.6,
    });
    expect(prefsToProfile({ sound: "off", volume: 0.333333, decor: "fixe", theme: "clair" })).toEqual({
      sound_pref: "off",
      decor_pref: "fixe",
      theme_pref: "clair",
      volume: 0.33,
    });
  });

  it("traduit le thème en attribut", () => {
    expect(themeAttribute("auto")).toBeNull();
    expect(themeAttribute("clair")).toBe("light");
    expect(themeAttribute("sombre")).toBe("dark");
  });
});
