import { describe, expect, it } from "vitest";
import { formatEuros, parseEuros } from "./money";

describe("montants", () => {
  it("affiche les prix ronds sans décimales", () => {
    expect(formatEuros(1200)).toBe("12 €");
    expect(formatEuros(1250).replace(/\s/g, " ")).toBe("12,50 €");
  });

  it("lit les prix saisis dans l'administration", () => {
    expect(parseEuros("12")).toBe(1200);
    expect(parseEuros("12,5")).toBe(1250);
    expect(parseEuros("12.05")).toBe(1205);
    expect(parseEuros(" 9 € ")).toBe(900);
    expect(parseEuros("douze")).toBeNull();
    expect(parseEuros("-3")).toBeNull();
    expect(parseEuros("1,234")).toBeNull();
  });
});
