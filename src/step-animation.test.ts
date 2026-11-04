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
