import { expect, it } from "vitest";
import { PerformanceRun } from "./performance";
import { FieldGait } from "./field-gait";
import { shows, turnStudy, setEnd } from "./repertoire";
for (const [show, start, continues] of [
  [turnStudy, 0, false],
  [shows[0], 8, true],
] as const)
  it(`lands right on eight with ${continues ? "body centered for continuing" : "right foot on halt endpoint"}`, () => {
    const run = new PerformanceRun(show, "Easy", 5, 1),
      gait = new FieldGait();
    const initial = show.drill.initial[5];
    gait.sample(
      0,
      { x: initial.x, z: initial.y },
      { x: initial.x, z: initial.y },
      true,
      false,
    );
    let previous = { x: initial.x, z: initial.y };
    let eight;
    for (let count = 0; count <= start + 7; count += 0.125) {
      run.marchAutomatically(count, {
        forward: 1,
        side: 0,
        aim: { x: 0, y: -1 },
      });
      const pos = run.position(count),
        step = run.steps.at(-1),
        page = show.page(count);
      const next = step?.to ?? pos;
      const frame = gait.sample(
        count,
        { x: pos.x, z: pos.y },
        { x: next.x, z: next.y },
        show.hold(count),
        false,
        0,
        {
          lastBeat: setEnd(show, page) - 1,
          continues: setEnd(show, page) < 112 && !show.hold(setEnd(show, page)),
        },
      );
      // No animation-owned body jump may exceed the physical per-count maximum.
      expect(
        Math.hypot(frame.body.x - previous.x, frame.body.z - previous.z),
      ).toBeLessThanOrEqual(2 + 1e-8);
      previous = frame.body;
      if (count === start + 7) eight = frame;
    }
    const goal = show.goal(start)[5];
    if (continues) {
      expect(eight!.body.z).toBeCloseTo(goal.y);
      expect(eight!.feet[1].z).toBeLessThan(goal.y);
    } else {
      expect(eight!.feet[1].z).toBeCloseTo(goal.y);
      expect(eight!.feet[1].x).toBeCloseTo(goal.x);
    }
  });
it("caps rendered catch-up body travel at two standard steps per count", () => {
  const gait = new FieldGait();
  gait.sample(0, { x: 0, z: 0 }, { x: 100, z: 100 }, false, false);
  const a = gait.sample(
    0.999999,
    { x: 0, z: 0 },
    { x: 100, z: 100 },
    false,
    false,
  );
  expect(Math.hypot(a.body.x, a.body.z)).toBeLessThanOrEqual(2);
});
