import { describe, it, expect } from "vitest";
import { shows } from "./repertoire";
import { PerformanceRun } from "./performance";

describe("dot distances and beat-aligned recovery", () => {
  for (const offset of [0, -0.03, 0.03, -0.08, 0.08]) {
    it(`reaches both opening dots with eight aimed taps per move (${offset}s)`, () => {
      const show = shows[0],
        run = new PerformanceRun(show, "Easy", 5, 1);
      expect(show.drill.initial[5].y - show.goal(8)[5].y).toBe(8);
      expect(show.goal(8)[5].y - show.goal(16)[5].y).toBe(8);
      for (let c = 8; c < 24; c++) {
        run.tap(show.tempo.seconds(c) + offset, {
          forward: 1,
          side: 0,
          aim: { x: 0, y: -1 },
        });
        if (c === 15 || c === 23)
          expect(run.position(c + 1)).toEqual(show.goal(c)[5]);
      }
      expect(run.faults).toBe(0);
      expect(run.steps.filter((s) => s.page === 1)).toHaveLength(8);
      expect(run.steps.filter((s) => s.page === 2)).toHaveLength(8);
      for (const step of run.steps) expect(step.size).toBeCloseTo(1);
    });
  }
  for (const show of shows) {
    it(`reaches every moving dot in ${show.name} with accurately aimed early taps`, () => {
      const run = new PerformanceRun(show, "Easy", 5, 1);
      for (let c = 0; c < show.drill.totalCounts; c++) {
        if (show.hold(c)) continue;
        const seconds = show.tempo.seconds(c) - 0.03;
        const from = run.position(show.tempo.count(seconds)),
          goal = show.goal(c)[5];
        run.tap(seconds, {
          forward: show.backward(c) ? -1 : 1,
          side: 0,
          aim: { x: goal.x - from.x, y: goal.y - from.y },
        });
        if (c % 8 === 7) {
          expect(run.position(c + 1).x).toBeCloseTo(goal.x);
          expect(run.position(c + 1).y).toBeCloseTo(goal.y);
        }
      }
      expect(run.steps.every((s) => s.size <= 2.000001)).toBe(true);
      expect(run.faults).toBe(0);
    });
  }
  it("does not travel before the set when its first tap is slightly early", () => {
    const show = shows[0],
      run = new PerformanceRun(show, "Easy", 5, 1);
    run.tap(show.tempo.seconds(8) - 0.03, {
      forward: 1,
      side: 0,
      aim: { x: 0, y: -1 },
    });
    expect(run.steps[0].page).toBe(1);
    expect(run.position(7.99)).toEqual(show.drill.initial[5]);
    expect(run.position(8)).toEqual(show.drill.initial[5]);
    expect(run.position(8.5).y).toBeLessThan(show.drill.initial[5].y);
  });
  it("classifies a slightly early hold downbeat as a stationary hold action", () => {
    const show = shows[0],
      run = new PerformanceRun(show, "Easy", 5, 1);
    run.tap(show.tempo.seconds(24) - 0.02, { forward: 1, side: 0 });
    expect(run.steps[0].hold).toBe(true);
    expect(run.steps[0].size).toBe(0);
    expect(run.position(24)).toEqual(run.position(31.9));
    expect(run.faults).toBe(1);
  });
  it("still penalizes taps in the middle of a hold and caps missed-step recovery", () => {
    const show = shows[0],
      run = new PerformanceRun(show, "Easy", 5, 1);
    run.tap(show.tempo.seconds(4), {
      forward: 1,
      side: 0,
      aim: { x: 0, y: -1 },
    });
    expect(run.faults).toBe(1);
    expect(run.position(5)).toEqual(show.drill.initial[5]);
    for (let c = 12; c < 16; c++)
      run.tap(show.tempo.seconds(c), {
        forward: 1,
        side: 0,
        aim: { x: 0, y: -1 },
      });
    expect(run.steps.every((s) => s.size <= 2)).toBe(true);
  });
});
