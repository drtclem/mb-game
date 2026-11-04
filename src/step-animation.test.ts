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
  it("plants the right on eight and lands the closing left on hold count one", () => {
    expect(haltClosure(23, false, true)).toBe(0);
    expect(haltClosure(23.5, false, true)).toBe(0);
    expect(haltClosure(23.75, false, true)).toBeCloseTo(0.5);
    expect(haltClosure(24, true, true)).toBe(1);
    expect(haltClosure(25, true, true)).toBe(1);
  });
  it("does not close continuous moving arrivals or reopen later holds", () => {
    expect(haltClosure(15.75, false, false)).toBe(1);
    expect(haltClosure(0, true, true)).toBe(1);
    expect(haltClosure(32, true, true)).toBe(1);
  });
});

it("lands the prepared left foot when the first step is actually tapped", () => {
  expect(stepAnimation({ ...step, stepOff: true }, 10).count).toBe(1);
});

it("lands each input-selected foot on its tap and prepares the next contact without creating one", () => {
  const left = { ...step, foot: 0 as const };
  const upcoming = { contact: 10.7, halfBeat: 0.35 };
  expect(stepAnimation(left, 10, false, upcoming).count).toBe(1);
  expect(stepAnimation(left, 10.4, false, upcoming).count).toBeGreaterThan(1);
  expect(stepAnimation(left, 10.69, false, upcoming).count).toBeLessThan(2);
  // A missed tap aborts the preparation rather than completing an automatic step.
  expect(stepAnimation(left, 11, false, upcoming).count).toBe(1);
  const right = { ...step, seconds: 10.7, end: 11.3, foot: 1 as const };
  expect(stepAnimation(right, 10.7).count).toBe(2);
});
