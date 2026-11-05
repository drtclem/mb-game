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
it("places maximum-size stride contacts ahead, within leg reach of the body", () => {
  const gait = new FieldGait();
  for (let beat = 0; beat < 8; beat++) {
    for (const fraction of [0, 0.25, 0.5, 0.75, 0.999]) {
      const pose = gait.sample(
        beat + fraction,
        { x: 0, z: -beat * 2 },
        { x: 0, z: -(beat + 1) * 2 },
        false,
        false,
      );
      expect(
        pose.feet.every(
          (f) => Math.hypot(f.x - pose.body.x, f.z - pose.body.z) < 1.1,
        ),
      ).toBe(true);
    }
  }
});
it("settles both shoes beneath the body during a turn hold after long strides", () => {
  const gait = new FieldGait();
  for (let beat = 0; beat < 8; beat++)
    gait.sample(
      beat + 0.99,
      { x: 0, z: -beat * 2 },
      { x: 0, z: -(beat + 1) * 2 },
      false,
      false,
    );
  gait.sample(8, { x: 0, z: -16 }, { x: 0, z: -16 }, true, false);
  const halt = gait.sample(
    8.999,
    { x: 0, z: -16 },
    { x: 0, z: -16 },
    true,
    false,
  );
  expect(
    halt.feet.every(
      (f) => Math.hypot(f.x - halt.body.x, f.z - halt.body.z) < 0.3,
    ),
  ).toBe(true);
});
it("prepares left on the and, then uses single standard opening strides", () => {
  const gait = new FieldGait();
  const prep = gait.prepare(1, { x: 0, z: 0 }, { x: 0, z: -1 });
  expect(prep.body.z).toBe(-0.5);
  expect(prep.feet[0].z).toBe(-1);
  const arrival = { lastBeat: 7, continues: false };
  const first = gait.sample(
    0,
    { x: 0, z: -1 },
    { x: 0, z: -2 },
    false,
    false,
    0,
    arrival,
  );
  expect(first.body.z).toBe(-0.5);
  const second = gait.sample(
    1,
    { x: 0, z: -2 },
    { x: 0, z: -3 },
    false,
    false,
    0,
    arrival,
  );
  expect(second.body.z).toBe(-1.5);
  expect(second.feet[1].z).toBe(-2);
  expect(Math.abs(second.body.z - first.body.z)).toBe(1);
});
