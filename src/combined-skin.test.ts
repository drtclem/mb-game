import { expect, it } from "vitest";
import { legWeights } from "./combined-skin";
it("keeps torso, arms, hands and instrument entirely on the stationary root", () => {
  for (const x of [-1, 0, 1])
    for (const y of [1.7, 2, 2.8, 3.7])
      expect(legWeights(x, y, 1.5, 0.84, 0.2)).toEqual({
        joints: [0, 0, 0, 0],
        weights: [1, 0, 0, 0],
      });
});
it("assigns normalized nonnegative leg weights with mirrored independent legs", () => {
  for (let y = 0; y < 1.7; y += 0.01)
    for (const x of [-0.3, 0, 0.3]) {
      const w = legWeights(x, y, 1.5, 0.84, 0.2);
      expect(w.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      expect(w.weights.every((n) => n >= 0 && n <= 1)).toBe(true);
    }
  expect(legWeights(0.3, 0.1, 1.5, 0.84, 0.2).joints).toContain(3);
  expect(legWeights(-0.3, 0.1, 1.5, 0.84, 0.2).joints).toContain(6);
});
