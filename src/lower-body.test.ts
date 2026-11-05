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
  expect(rehearsalPose(-0.6).feet.map((f) => f.z)).toEqual([
    -0.12 + 0.08 * (1 - Math.cos(Math.PI / 4)),
    0,
  ]);
  expect(rehearsalPose(-0.25).feet[0].lift).toBeGreaterThan(0);
  expect(rehearsalPose(-0.25).feet[1].planted).toBe(true);
  for (const c of [7, 7.25, 7.5, 7.75, 8, 9])
    expect(rehearsalPose(c).feet[1].z).toBe(-8);
  expect(
    rehearsalPose(8).feet.every(
      (f) => f.planted && f.lift === 0 && f.roll === 0,
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

it("keeps both heels raised through backward travel, then settles at the halt", () => {
  for (const count of [0, 0.2, 0.9, 1, 2.5, 5.5, 7, 7.6])
    expect(
      rehearsalPose(count, true).feet.every((foot) => foot.roll <= -0.33),
    ).toBe(true);
  expect(rehearsalPose(8, true).feet.every((foot) => foot.roll === 0)).toBe(
    true,
  );
});
it("starts closing promptly after eight and eases foot lift off the ground", () => {
  expect(rehearsalPose(7.15).phase).toBe("close");
  expect(rehearsalPose(7.15).feet[0].z).toBeLessThan(-7);
  expect(rehearsalPose(0.001).feet[1].lift).toBeLessThan(0.000001);
});
it("does not jerk body velocity after the first contact or final arrival", () => {
  const h = 0.0001;
  for (const count of [0, 7, 8]) {
    const before =
      (rehearsalPose(count).body.z - rehearsalPose(count - h).body.z) / h;
    const after =
      (rehearsalPose(count + h).body.z - rehearsalPose(count).body.z) / h;
    expect(Math.abs(before - after)).toBeLessThan(0.001);
  }
});

it("keeps marching feet parallel and forms a ninety-degree heel-to-arch halt", () => {
  for (const backward of [false, true]) {
    for (const count of [0, 1, 2.5, 6.9, 7])
      expect(rehearsalPose(count, backward).feet.map((f) => f.yaw)).toEqual([
        0, -0,
      ]);
    const [left, right] = rehearsalPose(8, backward).feet;
    expect(right.yaw).toBe(-Math.PI / 4);
    expect(left.yaw).toBe(Math.PI / 4);
    expect(left.yaw - right.yaw).toBe(Math.PI / 2);
    expect(left.x + 0.08 * Math.sin(left.yaw)).toBeCloseTo(right.x - 0.12);
    expect(left.z - 0.08 * (1 - Math.cos(left.yaw))).toBeCloseTo(
      right.z - 0.12,
    );
  }
});
