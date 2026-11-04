import { describe, it, expect } from "vitest";
import { PerformanceRun, formMetrics } from "./performance";
import { shows } from "./repertoire";
const show = shows[0];
describe("tap-driven performance", () => {
  it("never travels without taps, and marks time at neutral", () => {
    const r = new PerformanceRun(show, "Medium", 5, 4);
    const initial = { ...r.position(0) };
    r.advance(12);
    expect(r.position(12)).toEqual(initial);
    r.tap(show.tempo.seconds(12), { forward: 0, side: 0 });
    expect(r.position(13)).toEqual(initial);
    expect(r.steps).toHaveLength(1);
  });
  it("takes every tap, including wrong-way and extra taps; recovery never exceeds 4-to-5", () => {
    const r = new PerformanceRun(show, "Medium", 5, 4);
    const initial = r.position(8);
    r.tap(show.tempo.seconds(8), { forward: -1, side: 0 });
    expect(r.position(9).y).toBeGreaterThan(initial.y);
    r.tap(show.tempo.seconds(12), { forward: 1, side: 0 });
    r.tap(show.tempo.seconds(12) + 0.1, { forward: 1, side: 0 });
    expect(r.steps).toHaveLength(3);
    for (const step of r.steps) expect(step.size).toBeLessThanOrEqual(2.000001);
  });
  it("holds actual position, marks mistaken hold steps in place and retargets the next set", () => {
    const r = new PerformanceRun(show, "Hard", 5, 4);
    const anchor = r.position(24);
    r.advance(24);
    expect(r.position(25)).toEqual(anchor);
    for (let i = 0; i < 24; i++)
      r.tap(show.tempo.seconds(24 + i * 0.1), { forward: 1, side: 1 });
    const p = r.position(28);
    expect(p).toEqual(anchor);
    expect(r.steps.every((step) => step.size === 0)).toBe(true);
    expect(Math.hypot(p.x - anchor.x, p.y - anchor.y)).toBeLessThanOrEqual(
      0.35001,
    );
    expect(r.faults).toBe(24);
    r.tap(show.tempo.seconds(32), { forward: -1, side: 0 });
    expect(r.steps.at(-1)!.page).toBe(4);
  });
  it("judges neighboring shape and interval, excluding the player from the reference", () => {
    const ideal = show.target(12);
    const actual = ideal.map((p) => ({ x: p.x + 1, y: p.y }));
    const good = formMetrics(actual[5], actual, ideal, 5);
    expect(good.shape).toBeCloseTo(0);
    expect(good.spacing).toBeCloseTo(0);
    const bad = formMetrics(ideal[5], actual, ideal, 5);
    expect(bad.shape).toBeGreaterThan(0.5);
    expect(good.eligible).toBeGreaterThan(0.9);
  });
  it("scores identically regardless of render frequency and does not reward idle timing", () => {
    const a = new PerformanceRun(show, "Easy", 5, 42),
      b = new PerformanceRun(show, "Easy", 5, 42);
    for (let count = 8; count < 24; count++) {
      a.tap(show.tempo.seconds(count), { forward: 1, side: 0 });
      b.tap(show.tempo.seconds(count), { forward: 1, side: 0 });
      for (let c = count; c < count + 1; c += 0.1) a.advance(c);
    }
    a.advance(112);
    b.advance(112);
    expect(a.results()).toEqual(b.results());
    const idle = new PerformanceRun(show, "Easy", 5, 42);
    idle.advance(112);
    expect(idle.results().timing).toBe(0);
  });
});
describe("phrase boundaries and complete performances", () => {
  it("never lets a late moving step continue into a hold", () => {
    const r = new PerformanceRun(show, "Easy", 5, 1);
    r.tap(show.tempo.seconds(24) - 0.12, { forward: 1, side: 0 });
    expect(r.steps.at(-1)!.end).toBeLessThanOrEqual(show.tempo.seconds(24));
    expect(r.position(24)).toEqual(r.position(31.9));
  });
  it("makes a clean full show qualify while wrong-way marching loses points", () => {
    const clean = new PerformanceRun(show, "Easy", 5, 2),
      wrong = new PerformanceRun(show, "Easy", 5, 2);
    for (let c = 0; c < 112; c++)
      if (!show.hold(c)) {
        clean.tap(show.tempo.seconds(c), {
          forward: show.backward(c) ? -1 : 1,
          side: 0,
        });
        wrong.tap(show.tempo.seconds(c), {
          forward: show.backward(c) ? 1 : -1,
          side: 0,
        });
      }
    clean.advance(112);
    wrong.advance(112);
    expect(clean.results().total).toBeGreaterThan(65);
    expect(clean.results().total).toBeGreaterThan(wrong.results().total + 30);
  });
});
describe("camera-consistent correction controls", () => {
  it("right remains field-right when the written set marches backward", () => {
    const r = new PerformanceRun(show, "Easy", 5, 1);
    for (let c = 8; c < 24; c++)
      r.tap(show.tempo.seconds(c), { forward: 1, side: 0 });
    const from = r.position(32);
    r.tap(show.tempo.seconds(32), { forward: -1, side: 1 });
    expect(r.position(33).x).toBeGreaterThan(from.x);
  });
});
describe("device calibration", () => {
  it("adjusts timing judgement without moving the physical tap timestamp", () => {
    const r = new PerformanceRun(show, "Easy", 5, 1),
      actual = show.tempo.seconds(8) + 0.2;
    r.tap(actual, { forward: 1, side: 0 }, 0.2);
    expect(r.steps[0].seconds).toBe(actual);
    expect(r.steps[0].timing).toBe(100);
    expect(r.position(8)).toEqual(show.drill.initial[5]);
  });
});

describe("arrow-only gameplay", () => {
  it("reaches the next dot from eight individual forward-arrow presses", async () => {
    const { arrowStep } = await import("./controls");
    const r = new PerformanceRun(show, "Easy", 5, 1);
    for (let c = 8; c < 16; c++)
      r.tap(show.tempo.seconds(c), arrowStep({ key: "ArrowUp" }, false)!);
    expect(r.position(16)).toEqual(show.goal(8)[5]);
  });
});

describe("small persistent steering corrections", () => {
  it("keeps a small right adjustment on subsequent straight steps, then allows an opposite correction", () => {
    const r = new PerformanceRun(show, "Easy", 5, 1);
    r.tap(show.tempo.seconds(8), { forward: 1, side: 1 });
    const first = r.steps.at(-1)!;
    expect(first.to.x - first.from.x).toBeGreaterThan(0);
    expect(first.to.x - first.from.x).toBeLessThan(0.2);
    r.tap(show.tempo.seconds(9), { forward: 1, side: 0 });
    const second = r.steps.at(-1)!;
    expect(second.to.x).toBeGreaterThan(second.from.x);
    r.tap(show.tempo.seconds(10), { forward: 1, side: -1 });
    expect(r.steeringBias).toBeCloseTo(0);
    expect(r.steps.at(-1)!.to.x).toBeLessThan(r.steps.at(-1)!.from.x);
  });
  it("bounds accumulated corrections and starts a new set with fresh guidance", () => {
    const r = new PerformanceRun(show, "Easy", 5, 1);
    for (let c = 8; c < 16; c++)
      r.tap(show.tempo.seconds(c), { forward: 1, side: 1 });
    expect(Math.abs(r.steeringBias)).toBeLessThan(0.46);
    r.tap(show.tempo.seconds(16), { forward: 1, side: 0 });
    expect(r.steeringBias).toBe(0);
    expect(r.steps.every((s) => s.size <= 2.00001)).toBe(true);
  });
});

it("keeps phone tilt proportional rather than accumulating it every beat", () => {
  const r = new PerformanceRun(show, "Easy", 5, 1);
  r.tap(show.tempo.seconds(8), { forward: 1, side: 0.5 }, 0, "tilt");
  const first = r.steeringBias;
  r.tap(show.tempo.seconds(9), { forward: 1, side: 0.5 }, 0, "tilt");
  expect(r.steeringBias).toBe(first);
});

describe("mouse-directed steps", () => {
  it("travels along aim rather than automatically toward the dot", () => {
    const r = new PerformanceRun(show, "Medium", 5, 4);
    r.tap(show.tempo.seconds(8), { forward: 1, side: 0, aim: { x: 1, y: 0 } });
    const step = r.steps.at(-1)!;
    expect(step.to.x).toBeGreaterThan(step.from.x);
    expect(step.to.y).toBeCloseTo(step.from.y);
    expect(step.size).toBeLessThanOrEqual(2);
    expect(step.stepOff).toBe(true);
    r.tap(show.tempo.seconds(9), { forward: 1, side: 0, aim: { x: 0, y: -1 } });
    expect(r.steps.at(-1)!.stepOff).toBe(false);
  });
  it("never lets mouse aim move during a hold or without a tap", () => {
    const r = new PerformanceRun(show, "Medium", 5, 4);
    const before = r.position(0);
    r.tap(show.tempo.seconds(2), { forward: 1, side: 0, aim: { x: 1, y: 0 } });
    expect(r.position(3)).toEqual(before);
    expect(r.faults).toBe(1);
  });
});
