export const roster = [
  { name: "Maya", gender: "woman", skin: 0x995b3d, height: 0.97 },
  { name: "Eli", gender: "man", skin: 0xe0aa85, height: 1.03 },
  { name: "Sofia", gender: "woman", skin: 0xc78d69, height: 0.99 },
  { name: "Noah", gender: "man", skin: 0x754936, height: 1.01 },
  { name: "Ava", gender: "woman", skin: 0xf0c5a6, height: 0.96 },
  { name: "Leah", gender: "woman", skin: 0xb67b55, height: 1.0 },
  { name: "Isaac", gender: "man", skin: 0xc68a66, height: 1.04 },
  { name: "Zoe", gender: "woman", skin: 0x64402f, height: 0.98 },
  { name: "Theo", gender: "man", skin: 0xf0bf9d, height: 1.02 },
  { name: "Nina", gender: "woman", skin: 0xd6a17e, height: 1.01 },
  { name: "Owen", gender: "man", skin: 0x8c583d, height: 1.05 },
  { name: "Leo", gender: "man", skin: 0xb27a58, height: 1.0 },
] as const;

/** One count in swing, one in support. side 0 is left; count 0 starts count 1.
 * Forward: low clearance, toe-off behind and toe-up heel contact ahead.
 */
export function footPose(
  count: number,
  side: number,
  hold: boolean,
  backward: boolean,
) {
  if (hold) return { travel: 0, lift: 0, roll: 0 };
  const phase = (((count + side) % 2) + 2) % 2;
  const swing = phase < 1;
  return {
    travel: swing ? 0.5 * Math.cos(Math.PI * phase) : phase - 1.5,
    lift: swing ? Math.sin(Math.PI * phase) * 0.04 : 0,
    roll: backward
      ? -0.22
      : swing
        ? -0.23 * Math.cos(Math.PI * phase)
        : 0.23 * Math.cos(Math.PI * (phase - 1)),
  };
}

/** Close the last stride during count one of a hold, never during count eight. */
export function haltClosure(
  count: number,
  holding: boolean,
  wasHolding: boolean,
) {
  if (!holding || wasHolding || count < 8) return 1;
  const t = Math.max(0, Math.min(1, count % 8));
  return t * t * (3 - 2 * t);
}

/** Anticipation only: the left foot prepares on the and of eight. */
export function stepOffPreparation(
  count: number,
  holding: boolean,
  nextHolding: boolean,
) {
  if (!holding || nextHolding) return 0;
  return Math.max(0, Math.min(1, ((count % 8) - 7.5) * 2));
}

/** A halt arrival references the leading foot; continuous travel references the body. */
export function haltBodyOffset(
  count: number,
  holding: boolean,
  nextHolding: boolean,
  closure: number,
) {
  if (holding) return (1 - closure) * 0.5;
  return nextHolding ? Math.max(0, (count % 8) - 7) * 0.5 : 0;
}

/** Only the trailing left foot closes; the right foot is the planted anchor. */
export function haltFootPose(side: number, closure: number) {
  const remaining = 1 - Math.max(0, Math.min(1, closure));
  return {
    travel: (side === 0 ? 0.5 : -0.5) * remaining,
    lift: side === 0 ? Math.sin(Math.PI * (1 - remaining)) * 0.025 : 0,
    roll: 0,
  };
}
