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

/** One count in swing, one in support. side 0 is left; count 0 starts count 1. */
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
    lift: swing ? Math.sin(Math.PI * phase) * 0.13 : 0,
    roll: backward
      ? -0.22
      : swing
        ? 0.16 * Math.cos(Math.PI * phase)
        : 0.23 * Math.cos(Math.PI * (phase - 1)),
  };
}
