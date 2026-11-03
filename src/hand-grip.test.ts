import { expect, it } from "vitest";
import { Vector3 } from "three";
import { curlFinger } from "./hand-grip";
const forward = new Vector3(0, 1, 0),
  flex = new Vector3(0, 0, 1);
it("keeps the wrist and palm fixed while curling fingertips into the grip", () => {
  const palm = new Vector3(0.02, 0.03, 0);
  expect(curlFinger(palm, forward, flex, 0.05)).toEqual(palm);
  const tip = curlFinger(new Vector3(0.02, 0.13, 0), forward, flex, 0.05);
  expect(tip.x).toBe(0.02);
  expect(tip.y).toBeLessThan(0.08);
  expect(tip.z).toBeGreaterThan(0.03);
  expect(tip.toArray().every(Number.isFinite)).toBe(true);
});
it("joins the unchanged palm continuously at the knuckle", () => {
  const at = new Vector3(0, 0.05, 0),
    next = new Vector3(0, 0.050001, 0);
  expect(
    curlFinger(at, forward, flex, 0.05).distanceTo(
      curlFinger(next, forward, flex, 0.05),
    ),
  ).toBeLessThan(0.000002);
});
