import { describe, it, expect } from "vitest";
import { stepAnimation } from "./step-animation";
const step = {
  seconds: 10,
  end: 10.6,
  number: 0,
  from: { x: 0, y: 40 },
  to: { x: 0, y: 39 },
  backward: false,
};
describe("tap-driven visible stride", () => {
  it("animates the tap and preserves the landed stride instead of resetting the feet", () => {
    expect(stepAnimation(step, 10.3).count).toBeCloseTo(0.5);
    expect(stepAnimation(step, 10.6)).toEqual({
      count: 1,
      hold: false,
      backward: false,
      dx: 0,
      dz: -1,
    });
    expect(stepAnimation(step, 30)).toEqual(stepAnimation(step, 10.6));
  });
  it("alternates feet continuously at the next tap and retains tiny mark time", () => {
    const next = { ...step, number: 1, seconds: 10.7, end: 11.3 };
    expect(stepAnimation(step, 10.7).count).toBe(
      stepAnimation(next, 10.7).count,
    );
    expect(stepAnimation({ ...step, to: step.from }, 10.3).dz).toBe(-0.05);
  });
});

describe("feet together during holds", () => {
  it("closes the previous traveling stride when a hold begins", () => {
    expect(stepAnimation(step, 11, true).hold).toBe(true);
    expect(stepAnimation(step, 11, false).hold).toBe(false);
  });
  it("still animates a mistaken hold press, then returns feet together", () => {
    const mistake = { ...step, hold: true, to: step.from };
    expect(stepAnimation(mistake, 10.3, true).hold).toBe(false);
    expect(stepAnimation(mistake, 10.6, true).hold).toBe(true);
  });
});

import { haltClosure } from "./marching-motion";
describe("halt closing count", () => {
  it("keeps count eight traveling and closes through the first hold count", () => {
    expect(haltClosure(23.99, false, false)).toBe(1);
    expect(haltClosure(24, true, false)).toBe(0);
    expect(haltClosure(24.5, true, false)).toBeCloseTo(0.5);
    expect(haltClosure(25, true, false)).toBe(1);
  });
  it("does not reopen the stance on later holds or the opening hold", () => {
    expect(haltClosure(0, true, true)).toBe(1);
    expect(haltClosure(32, true, true)).toBe(1);
  });
});

it("lands the prepared left foot when the first step is actually tapped", () => {
  expect(stepAnimation({ ...step, stepOff: true }, 10).count).toBe(1);
});
