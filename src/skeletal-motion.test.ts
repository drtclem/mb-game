import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { twoBoneTargets } from "./skeletal-motion";

describe("marching joint constraints", () => {
  it("reaches a foot target without stretching either leg segment", () => {
    const hip = new Vector3(0, 1.6, 0),
      target = new Vector3(0, 0.2, -0.2);
    const { knee, end } = twoBoneTargets(
      hip,
      target,
      0.75,
      0.75,
      new Vector3(0, 0, -1),
    );
    expect(hip.distanceTo(knee)).toBeCloseTo(0.75);
    expect(knee.distanceTo(end)).toBeCloseTo(0.75);
    expect(end.distanceTo(target)).toBeCloseTo(0);
    expect(knee.z).toBeLessThan(0);
  });
  it("clamps out-of-reach targets rather than extending limbs", () => {
    const hip = new Vector3(0, 1.6, 0);
    const { knee, end } = twoBoneTargets(
      hip,
      new Vector3(4, 0, 0),
      0.7,
      0.6,
      new Vector3(0, 0, -1),
    );
    expect(hip.distanceTo(knee)).toBeCloseTo(0.7);
    expect(knee.distanceTo(end)).toBeCloseTo(0.6);
    expect(hip.distanceTo(end)).toBeLessThan(1.3);
  });
  it("is finite for collapsed targets and parallel bend references", () => {
    for (const target of [new Vector3(), new Vector3(0, -1, 0)]) {
      const { knee, end } = twoBoneTargets(
        new Vector3(),
        target,
        0.8,
        0.6,
        new Vector3(0, -1, 0),
      );
      expect([...knee.toArray(), ...end.toArray()].every(Number.isFinite)).toBe(
        true,
      );
      expect(knee.length()).toBeCloseTo(0.8);
      expect(knee.distanceTo(end)).toBeCloseTo(0.6);
    }
  });
});
