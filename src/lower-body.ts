/** Field-space foot anchors, independent of the body and render frame history.
 * Count 0 is the first left-foot contact; count 7 is right-foot contact eight.
 */
export type GroundFoot = {
  x: number;
  z: number;
  lift: number;
  roll: number;
  planted: boolean;
};
export type LowerBodyPose = {
  body: { x: number; z: number };
  feet: [GroundFoot, GroundFoot];
  phase: "stand" | "prepare" | "march" | "close" | "hold";
  label: string;
};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function rehearsalPose(count: number, backward = false): LowerBodyPose {
  const direction = backward ? 1 : -1;
  const closingStart = 7.05;
  const preparation = clamp((count + 0.5) * 2);
  const arrival = clamp(count - 7);
  // Match body velocity at step-off and decelerate through the final close.
  const distance =
    count < 0
      ? 0.5 * preparation * preparation * (2 - preparation)
      : count < 7
        ? count + 0.5
        : 7.5 + 0.5 * (arrival + Math.sin(Math.PI * arrival) / Math.PI);
  const feet = [0, 1].map((side) => {
    const contacts = side === 0 ? [0, 2, 4, 6, 8] : [1, 3, 5, 7];
    const next = contacts.find((n) => n > count);
    const previous = [...contacts].reverse().find((n) => n <= count);
    const at = (n: number | undefined) =>
      n === undefined ? 0 : n === 8 ? 8 : n + 1;
    let travel = at(previous),
      lift = 0,
      roll = 0,
      planted = true;
    if (next !== undefined) {
      const start = next === 0 ? -0.5 : next === 8 ? closingStart : next - 1;
      if (count >= start) {
        const t = clamp((count - start) / (next - start));
        travel = mix(at(previous), at(next), ease(t));
        lift = Math.sin(Math.PI * t) ** 2 * (backward ? 0.016 : 0.02);
        const initialRoll = next === 0 ? 0 : backward ? -0.34 : -0.22;
        const finalRoll = next === 8 ? 0 : backward ? -0.34 : 0.25;
        roll = mix(initialRoll, finalRoll, ease(t));
        planted = false;
      } else if (previous !== undefined) {
        const u = clamp(count - previous);
        roll = backward ? -0.34 : mix(0.25, -0.22, ease(u));
      } else if (side === 1) {
        roll = (backward ? -0.34 : -0.22) * ease((count + 0.5) * 2);
      }
    } else if (count < 8 && side === 1) {
      roll = backward
        ? -0.34 * (1 - ease((count - 7.75) * 4))
        : 0.25 * (1 - ease((count - 7) * 2));
    }
    if (backward && count >= 0 && count < 8)
      roll = -0.34 * (1 - ease((count - 7.75) * 4));
    return {
      x: side === 0 ? -0.12 : 0.12,
      z: travel * direction,
      lift,
      roll,
      planted,
    };
  }) as [GroundFoot, GroundFoot];
  const phase =
    count < -0.5
      ? "stand"
      : count < 0
        ? "prepare"
        : count >= 8
          ? "hold"
          : count >= closingStart
            ? "close"
            : "march";
  const label =
    phase === "stand"
      ? "SET · FEET TOGETHER"
      : phase === "prepare"
        ? "AND OF 8 · LEFT PREPARES"
        : phase === "hold"
          ? "HOLD 1 · FEET TOGETHER"
          : phase === "close"
            ? "8 → 1 · LEFT CLOSES"
            : `COUNT ${Math.floor(count) + 1} · ${Math.floor(count) % 2 === 0 ? "LEFT" : "RIGHT"}`;
  return { body: { x: 0, z: direction * distance }, feet, phase, label };
}
