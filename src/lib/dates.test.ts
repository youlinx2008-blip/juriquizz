import { describe, expect, it } from "vitest";
import { currentAcademicYear, parisDateInput, parisEndOfDay, parisOffsetMinutes } from "./dates";

describe("dates à l'heure de Paris", () => {
  it("connaît l'heure d'hiver et l'heure d'été", () => {
    expect(parisOffsetMinutes(Date.UTC(2027, 0, 15))).toBe(60);
    expect(parisOffsetMinutes(Date.UTC(2027, 6, 15))).toBe(120);
  });

  it("donne la fin de la journée, heure de Paris", () => {
    expect(parisEndOfDay("2027-01-31")).toBe("2027-01-31T22:59:59.000Z");
    expect(parisEndOfDay("2027-05-31")).toBe("2027-05-31T21:59:59.000Z");
    expect(parisEndOfDay("31/01/2027")).toBeNull();
    expect(parisEndOfDay("")).toBeNull();
  });

  it("donne l'année universitaire en cours, qui commence en septembre", () => {
    expect(currentAcademicYear(new Date("2026-10-04T12:00:00Z"))).toBe("2026-2027");
    expect(currentAcademicYear(new Date("2027-05-31T12:00:00Z"))).toBe("2026-2027");
    expect(currentAcademicYear(new Date("2027-08-31T21:30:00Z"))).toBe("2026-2027");
    expect(currentAcademicYear(new Date("2027-08-31T22:30:00Z"))).toBe("2027-2028");
  });

  it("prépare un champ date au jour de Paris", () => {
    expect(parisDateInput("2027-01-31T22:59:59Z")).toBe("2027-01-31");
    expect(parisDateInput(null)).toBe("");
  });
});
