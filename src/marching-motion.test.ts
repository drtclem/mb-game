import { describe, it, expect } from "vitest";
import {
  footPose,
  roster,
  stepOffPreparation,
  haltBodyOffset,
  haltFootPose,
  stepOffFootPose,
} from "./marching-motion";

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
  it("rolls continuously from toe-off through heel contact without an ankle snap", () => {
    for (const contact of [0, 1, 2, 3]) {
      const before = footPose(contact - 1e-6, 0, false, false);
      const after = footPose(contact + 1e-6, 0, false, false);
      expect(Math.abs(after.roll - before.roll)).toBeLessThan(1e-5);
    }
    expect(footPose(0, 0, false, false).roll).toBeLessThan(0);
    expect(footPose(1, 0, false, false).roll).toBeGreaterThan(0);
  });
  it("keeps swing clearance low for a gliding roll step", () => {
    for (let count = 0; count <= 2; count += 0.025)
      expect(footPose(count, 0, false, false).lift).toBeLessThanOrEqual(0.05);
  });
});

describe("step-off preparation", () => {
  it("prepares only on the and of eight before movement", () => {
    expect(stepOffPreparation(7.49, true, false)).toBe(0);
    expect(stepOffPreparation(7.75, true, false)).toBe(0.5);
    expect(stepOffPreparation(7.99, true, false)).toBeCloseTo(0.98);
    expect(stepOffPreparation(7.75, true, true)).toBe(0);
    expect(stepOffPreparation(7.75, false, false)).toBe(0);
  });
});

it("uses a foot-centered arrival only before a halt", () => {
  expect(haltBodyOffset(15.9, false, false, 1)).toBe(0);
  expect(haltBodyOffset(23.5, false, true, 1)).toBeCloseTo(0.25);
  expect(haltBodyOffset(24, true, true, 0)).toBe(0.5);
  expect(haltBodyOffset(25, true, true, 1)).toBe(0);
});

describe("single-foot halt closure", () => {
  it("anchors the right foot through count one while only the left foot closes", () => {
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const right = haltFootPose(1, progress),
        left = haltFootPose(0, progress);
      const body = -0.5 * (1 - progress);
      expect(body - right.travel).toBeCloseTo(0);
      expect(right.lift).toBe(0);
      expect(right.roll).toBe(0);
      expect(body - left.travel).toBeCloseTo(-(1 - progress));
    }
    expect(haltFootPose(0, 0.5).lift).toBeGreaterThan(0);
  });
});

describe("reference step-off mechanics", () => {
  it("pushes from the right forefoot while the left foot stays low and arrives toe-up", () => {
    const right = stepOffFootPose(1, 1, false),
      left = stepOffFootPose(1, 0, false);
    expect(right.travel).toBe(0);
    expect(right.lift).toBe(0);
    expect(right.roll).toBeLessThan(0);
    expect(left.travel).toBe(-0.5);
    expect(left.roll).toBeGreaterThan(0);
    for (let t = 0; t <= 1; t += 0.05)
      expect(stepOffFootPose(t, 0, false).lift).toBeLessThanOrEqual(0.018);
  });
  it("keeps backward steps low with both heels modestly raised", () => {
    for (const side of [0, 1])
      expect(stepOffFootPose(1, side, true).roll).toBeCloseTo(-0.22);
    for (let t = 0; t <= 1; t += 0.05)
      expect(stepOffFootPose(t, 0, true).lift).toBeLessThanOrEqual(0.012);
  });
});
