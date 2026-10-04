import { describe, expect, it } from "vitest";
import { formatClock, formatDuration, onTwenty, spokenRemaining } from "./exam-format";

describe("examens blancs : affichage", () => {
  it("affiche les durées et le chronomètre", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(90)).toBe("1 h 30");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatClock(30 * 60_000)).toBe("30:00");
    expect(formatClock(65_400)).toBe("1:06");
    expect(formatClock(3_900_000)).toBe("1:05:00");
    expect(formatClock(-5000)).toBe("0:00");
  });

  it("annonce le temps restant et la note sur 20", () => {
    expect(spokenRemaining(12 * 60_000 + 5000)).toBe("12 minutes");
    expect(spokenRemaining(61_000)).toBe("1 minute");
    expect(spokenRemaining(30_000)).toBe("moins d’une minute");
    expect(onTwenty(15, 20)).toBe("15");
    expect(onTwenty(7, 9)).toBe("15,5");
    expect(onTwenty(0, 0)).toBe("0");
  });
});
