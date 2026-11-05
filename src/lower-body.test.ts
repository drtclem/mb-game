import { expect, it } from "vitest";
import { rehearsalPose } from "./lower-body";
it("lands left on odd counts and right on even counts at exact written footprints", () => {
  for (const backward of [false, true])
    for (let c = 0; c < 8; c++) {
      const pose = rehearsalPose(c, backward),
        foot = pose.feet[c % 2];
      expect(foot.planted).toBe(true);
      expect(foot.z).toBe((backward ? 1 : -1) * (c + 1));
      expect(foot.lift).toBe(0);
    }
});
it("keeps a supporting foot fixed in field space while the body travels", () => {
  for (let c = 0; c < 7; c++) {
    const a = rehearsalPose(c + 0.01),
      b = rehearsalPose(c + 0.99);
    expect(a.feet[c % 2].z).toBe(b.feet[c % 2].z);
    expect(a.body.z).not.toBe(b.body.z);
  }
});
it("prepares only the left first, then closes it to the anchored right on hold one", () => {
  expect(rehearsalPose(-0.6).feet.map((f) => f.z)).toEqual([-0, -0]);
  expect(rehearsalPose(-0.25).feet[0].lift).toBeGreaterThan(0);
  expect(rehearsalPose(-0.25).feet[1].planted).toBe(true);
  for (const c of [7, 7.25, 7.5, 7.75, 8, 9])
    expect(rehearsalPose(c).feet[1].z).toBe(-8);
  expect(
    rehearsalPose(8).feet.every(
      (f) => f.planted && f.z === -8 && f.lift === 0 && f.roll === 0,
    ),
  ).toBe(true);
});
it("is continuous through contacts, preparation, closure and hold", () => {
  for (const backward of [false, true])
    for (const c of [-0.5, 0, 1, 2, 3, 4, 5, 6, 7, 7.5, 8]) {
      const a = rehearsalPose(c - 1e-6, backward),
        b = rehearsalPose(c + 1e-6, backward);
      expect(Math.abs(a.body.z - b.body.z)).toBeLessThan(0.0001);
      for (let side = 0; side < 2; side++) {
        expect(Math.abs(a.feet[side].z - b.feet[side].z)).toBeLessThan(0.0001);
        expect(Math.abs(a.feet[side].roll - b.feet[side].roll)).toBeLessThan(
          0.0001,
        );
      }
    }
});
