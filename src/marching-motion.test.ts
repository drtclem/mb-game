import { describe, it, expect } from "vitest";
import { footPose, roster } from "./marching-motion";

describe("marcher animation", () => {
  it("casts exactly six women and six men with stable individual appearances", () => {
    expect(roster.filter((p) => p.gender === "woman")).toHaveLength(6);
    expect(roster.filter((p) => p.gender === "man")).toHaveLength(6);
    expect(new Set(roster.map((p) => p.name)).size).toBe(12);
  });
  it("steps off with the left foot, then alternates on each count", () => {
    expect(footPose(0.5, 0, false, false).lift).toBeGreaterThan(0);
    expect(footPose(0.5, 1, false, false).lift).toBe(0);
    expect(footPose(1.5, 1, false, false).lift).toBeGreaterThan(0);
    expect(footPose(1.5, 0, false, false).lift).toBe(0);
  });
  it("plants both feet on holds regardless of phase or direction", () => {
    for (const c of [0, 0.3, 1.7, 19.2])
      for (const side of [0, 1]) {
        expect(footPose(c, side, true, true)).toEqual({
          travel: 0,
          lift: 0,
          roll: 0,
        });
      }
  });
  it("keeps the planted foot stationary relative to a linearly moving field", () => {
    const a = footPose(1.2, 0, false, false);
    const b = footPose(1.6, 0, false, false);
    expect(b.travel - 1.6 - (a.travel - 1.2)).toBeCloseTo(0);
  });
  it("raises the heel for backward marching and repeats deterministically", () => {
    expect(footPose(1.5, 0, false, true).roll).toBeLessThan(0);
    expect(footPose(4.5, 0, false, false)).toEqual(
      footPose(2.5, 0, false, false),
    );
  });
});
