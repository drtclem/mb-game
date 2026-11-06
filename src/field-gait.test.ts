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
  const limited = 2 / (1 + Math.PI / 4) / Math.sqrt(2);
  expect(halt.body.x).toBeCloseTo(limited);
  expect(halt.body.z).toBeCloseTo(-1 - limited);
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

it("alternates small in-place steps while turning without translating the body", () => {
  const gait = new FieldGait();
  const a = gait.sample(
    8.5,
    { x: 0, z: 0 },
    { x: 0, z: 0 },
    true,
    false,
    Math.PI / 4,
  );
  const b = gait.sample(
    9.5,
    { x: 0, z: 0 },
    { x: 0, z: 0 },
    true,
    false,
    (Math.PI * 3) / 4,
  );
  expect(a.feet[0].lift).toBeGreaterThan(0);
  expect(a.feet[1].lift).toBe(0);
  expect(b.feet[1].lift).toBeGreaterThan(0);
  expect(b.feet[0].lift).toBe(0);
  expect(b.body).toEqual(a.body);
});
it("bounds contact spans during every move with abrupt direction and stride changes", () => {
  const gait = new FieldGait();
  let from = { x: 0, z: 0 };
  for (let beat = 0; beat < 112; beat++) {
    const direction = beat % 3 === 0 ? 1 : -1;
    const next = { x: from.x + direction * 2, z: from.z + direction * 0.5 };
    const pose = gait.sample(beat + 0.999, from, next, false, direction > 0);
    const [l, r] = pose.feet;
    expect(Math.hypot(l.x - r.x, l.z - r.z)).toBeLessThanOrEqual(2 + 1e-6);
    from = pose.body;
  }
});

import { shows, turnStudy, contactCount, setEnd } from "./repertoire";
it("checks every performer through every set transition in both playable shows", () => {
  for (const show of [turnStudy, shows[1]])
    for (let id = 0; id < 12; id++) {
      const gait = new FieldGait(),
        initial = show.drill.initial[id],
        first = show.drill.pages[0].dots[id];
      let previous = gait.prepare(
        1,
        { x: initial.x, z: initial.y },
        {
          x: initial.x + (first.x - initial.x) / 8,
          z: initial.y + (first.y - initial.y) / 8,
        },
      ).body;
      for (let count = 0; count < 112; count += 0.125) {
        const page = show.page(count),
          end = setEnd(show, page),
          holding = show.hold(count);
        const current = show.target(contactCount(show, count))[id];
        const next = show.target(Math.min(112, Math.floor(count) + 2))[id];
        const preparation =
          holding && end < 112 && !show.hold(end)
            ? Math.max(0, (count - end + 0.5) * 2)
            : 0;
        const contact = show.target(end + 1)[id];
        const pose =
          preparation > 0
            ? gait.prepare(
                preparation,
                { x: current.x, z: current.y },
                { x: contact.x, z: contact.y },
              )
            : gait.sample(
                count,
                { x: current.x, z: current.y },
                { x: next.x, z: next.y },
                holding,
                next.y > current.y,
                0,
                { lastBeat: end - 1, continues: end < 112 && !show.hold(end) },
              );
        expect(
          Math.hypot(pose.body.x - previous.x, pose.body.z - previous.z),
        ).toBeLessThan(0.76);
        previous = pose.body;
      }
    }
});
it("turns in four planted quarter steps while keeping the supporting shoe fixed in world space", () => {
  for (const direction of [-1, 1]) {
    const gait = new FieldGait();
    for (let beat = 0; beat < 4; beat++) {
      const a = gait.pivot(beat + 0.1, { x: 0, z: 0 }, direction);
      const b = gait.pivot(beat + 0.4, { x: 0, z: 0 }, direction);
      const support = 1 - (beat % 2);
      expect(b.pose.feet[support].x).toBe(a.pose.feet[support].x);
      expect(b.pose.feet[support].z).toBe(a.pose.feet[support].z);
      expect(b.pose.feet[support].yaw + b.facing).toBeCloseTo(
        a.pose.feet[support].yaw + a.facing,
      );
      expect(b.pose.body).toEqual({ x: 0, z: 0 });
      const landed = gait.pivot(beat + 0.5, { x: 0, z: 0 }, direction);
      expect(landed.facing).toBeCloseTo((direction * (beat + 1) * Math.PI) / 2);
      expect(landed.pose.feet[beat % 2].lift).toBeCloseTo(0);
    }
  }
});
it("faces feet and the lower body along lateral travel while keeping the upper-body frame separate", () => {
  for (const direction of [-1, 1]) {
    const gait = new FieldGait();
    const pose = gait.sample(
      0,
      { x: 0, z: 0 },
      { x: direction, z: 0 },
      false,
      false,
    );
    expect(pose.lowerYaw).toBeCloseTo(0);
    const settled = gait.sample(
      0.999,
      { x: 0, z: 0 },
      { x: direction, z: 0 },
      false,
      false,
    );
    expect(settled.lowerYaw).toBeCloseTo((-direction * Math.PI) / 2, 4);
    expect(
      pose.feet.every(
        (f) => Math.abs(f.yaw + (direction * Math.PI) / 2) < 1e-6,
      ),
    ).toBe(true);
    const prep = new FieldGait().prepare(
      1,
      { x: 0, z: 0 },
      { x: direction, z: 0 },
    );
    expect(prep.lowerYaw).toBeCloseTo((-direction * Math.PI) / 2);
  }
});

it("settles shoe yaw smoothly after a full right pivot instead of snapping to attention", () => {
  const gait = new FieldGait();
  for (let c = 0; c <= 3.5; c += 0.125) gait.pivot(c, { x: 0, z: 0 }, -1);
  const before = gait.pivot(3.5, { x: 0, z: 0 }, -1).pose;
  const after = gait.sample(68, { x: 0, z: 0 }, { x: 0, z: 0 }, true, false);
  expect(after.feet[0].yaw).toBeCloseTo(before.feet[0].yaw);
  expect(after.feet[1].yaw).toBeCloseTo(before.feet[1].yaw);
});
it("backs up square to the front on backward diagonals, but still slides on mostly sideways travel", () => {
  for (const direction of [-1, 1]) {
    const back = new FieldGait();
    back.sample(0, { x: 0, z: 0 }, { x: direction, z: 1 }, false, true);
    const square = back.sample(0.999, { x: 0, z: 0 }, { x: direction, z: 1 }, false, true);
    expect(square.lowerYaw).toBeCloseTo(0, 4);
    expect(square.feet.every((f) => Math.abs(f.yaw) < 1e-6 && f.roll === -0.34)).toBe(true);
    const slide = new FieldGait();
    slide.sample(0, { x: 0, z: 0 }, { x: direction, z: 0.2 }, false, true);
    const sideways = slide.sample(0.999, { x: 0, z: 0 }, { x: direction, z: 0.2 }, false, true);
    expect(Math.abs(sideways.lowerYaw ?? 0)).toBeGreaterThan(1);
  }
});
