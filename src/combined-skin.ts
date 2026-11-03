import { MathUtils } from "three";

/** Root plus two three-bone legs. Upper body and instrument stay rigid on root. */
export function legWeights(
  x: number,
  y: number,
  hip: number,
  knee: number,
  ankle: number,
) {
  const joints = [0, 0, 0, 0],
    weights = [1, 0, 0, 0];
  if (y >= hip + 0.2) return { joints, weights };
  const left = MathUtils.smoothstep(x, -0.05, 0.05);
  const upper = 1 - MathUtils.smoothstep(y, hip - 0.15, hip + 0.2);
  const shin = 1 - MathUtils.smoothstep(y, knee - 0.12, knee + 0.12);
  const foot = 1 - MathUtils.smoothstep(y, ankle - 0.07, ankle + 0.07);
  if (upper < 1) {
    return {
      joints: [0, 1, 4, 0],
      weights: [1 - upper, upper * left, upper * (1 - left), 0],
    };
  }
  const base = x >= 0 ? 1 : 4;
  if (foot > 0)
    return {
      joints: [base + 1, base + 2, 0, 0],
      weights: [1 - foot, foot, 0, 0],
    };
  return { joints: [base, base + 1, 0, 0], weights: [1 - shin, shin, 0, 0] };
}
