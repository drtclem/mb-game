import { describe, it, expect } from "vitest";
import { countDisplay, moveDisplay } from "./count-display";
import { shows } from "./repertoire";
describe("musical count and move structure", () => {
  it("shows both four-count halves without disguising an eight-count set", () => {
    expect(countDisplay(0)).toMatchObject({
      active: 0,
      position: "1 / 8",
      caption: "FIRST FOUR",
    });
    expect(countDisplay(4)).toMatchObject({
      active: 0,
      position: "5 / 8",
      caption: "SECOND FOUR",
    });
    expect(countDisplay(7.9)).toMatchObject({ active: 3, position: "8 / 8" });
    expect(countDisplay(8)).toMatchObject({ active: 0, position: "1 / 8" });
  });
  it("preserves the eight-beat 5…6…5678 countoff with a ready state", () => {
    expect(countDisplay(0, -0.1)).toMatchObject({
      active: -1,
      position: "READY",
    });
    expect(countDisplay(0, 2)).toMatchObject({
      labels: ["5", "…", "6", "…"],
      active: 2,
      position: "3 / 8",
    });
    expect(countDisplay(0, 6)).toMatchObject({
      labels: ["5", "6", "7", "8"],
      active: 2,
      position: "7 / 8",
    });
  });
  it("previews the opening hold, then current/next sets and the final release", () => {
    expect(moveDisplay(shows[0], 0, 0).next?.label).toBe("HOLD · 8 COUNTS");
    expect(moveDisplay(shows[0], 6.2)).toMatchObject({
      now: { label: "HOLD · 8 COUNTS" },
      next: { label: "MOVE · 8 COUNTS" },
      remaining: 2,
      progress: 6,
    });
    expect(moveDisplay(shows[0], 104).next).toBeNull();
    expect(moveDisplay(shows[0], 104).remaining).toBe(8);
  });
});
