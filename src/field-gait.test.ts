import { expect, it } from "vitest";
import { FieldGait } from "./field-gait";
it("keeps the planted foot fixed when steering changes during a count", () => {
  const gait = new FieldGait();
  const a = gait.sample(8.1, { x: 0, z: 0 }, { x: 0, z: -1 }, false, false);
  const b = gait.sample(8.9, { x: 7, z: 4 }, { x: 4, z: 2 }, false, false);
  expect(b.feet[0].x).toBe(a.feet[0].x);
  expect(b.feet[0].z).toBe(a.feet[0].z);
  expect(b.body.x).toBe(0);
  expect(b.body.z).toBeCloseTo(-0.9);
});
it("joins steps continuously and stops body travel at the hold without snapping to a dot", () => {
  const gait = new FieldGait();
  const a = gait.sample(
    8.999999,
    { x: 0, z: 0 },
    { x: 0, z: -1 },
    false,
    false,
  );
  const b = gait.sample(9, { x: 0, z: -1 }, { x: 1, z: -2 }, false, false);
  expect(Math.hypot(a.body.x - b.body.x, a.body.z - b.body.z)).toBeLessThan(
    0.00001,
  );
  gait.sample(9.999999, { x: 0, z: -1 }, { x: 1, z: -2 }, false, false);
  const halt = gait.sample(
    10,
    { x: 100, z: 100 },
    { x: 100, z: 100 },
    true,
    false,
  );
  expect(halt.body).toEqual({ x: 1, z: -2 });
  const later = gait.sample(
    12.5,
    { x: 100, z: 100 },
    { x: 100, z: 100 },
    true,
    false,
  );
  expect(later.body).toEqual(halt.body);
});
it("retains parallel moving shoes and raised backward heels", () => {
  const gait = new FieldGait();
  const frame = gait.sample(8.5, { x: 0, z: 0 }, { x: 0, z: 1 }, false, true);
  expect(frame.feet.every((f) => f.yaw === 0 && f.roll === -0.34)).toBe(true);
});

it("clears all previous field anchors on retry", () => {
  const gait = new FieldGait();
  gait.sample(8.5, { x: 50, z: 20 }, { x: 51, z: 21 }, false, false);
  gait.reset();
  const fresh = gait.sample(0, { x: 0, z: 0 }, { x: 0, z: 0 }, true, false);
  expect(fresh.body).toEqual({ x: 0, z: 0 });
  expect(fresh.feet.every((f) => Math.abs(f.x) < 1 && Math.abs(f.z) < 1)).toBe(
    true,
  );
});
