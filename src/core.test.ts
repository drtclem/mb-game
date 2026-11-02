import { describe, it, expect } from "vitest";
import { TempoMap, judge, calibrationOffset } from "./tempo";
import { formatDot, parseDot, checkShow } from "./drill";
import { show } from "./show";
import { Run, drift, target, tempo, PLAYER, formError } from "./game";
describe("music clock", () => {
  it("converts both directions, including count-off", () => {
    const t = TempoMap.steady(112, 80);
    for (const c of [-8, -0.5, 0, 3.25, 80])
      expect(t.count(t.seconds(c))).toBeCloseTo(c);
  });
  it("follows beat-tracked accel and meter changes", () => {
    const t = new TempoMap(
      [0, 0.6, 1.1, 1.5, 1.8],
      [
        { count: 0, beats: 4 },
        { count: 2, beats: 3 },
      ],
    );
    expect(t.seconds(2.5)).toBe(1.3);
    expect(t.count(1.3)).toBe(2.5);
    expect(t.counter(5)).toBe(1);
    expect(() => new TempoMap([0, 0])).toThrow();
  });
  it("uses fixed millisecond windows and early/late language", () => {
    expect([0, 0.045, 0.09, -0.15, 0.15, 0.151].map(judge)).toEqual([
      "Perfect",
      "Perfect",
      "Good",
      "Rushing",
      "Dragging",
      "Miss",
    ]);
  });
  it("calibrates with a median resistant to stray taps", () => {
    expect(calibrationOffset([0.04, 0.05, 0.06, 0.5, 0.05])).toBe(0.05);
  });
});
describe("drill sheets", () => {
  it("parses the written example", () =>
    expect(parseDot("2 outside S1 40, 3 behind FH")).toEqual({
      x: -18,
      y: 35,
    }));
  it("round trips quarter steps on both sides", () => {
    for (let x = -80; x <= 80; x += 0.25)
      for (const y of [0, 31.75, 32, 53.25, 85.25])
        expect(parseDot(formatDot({ x, y }))).toEqual({ x, y });
  });
  it("rejects off-grid or malformed coordinates", () => {
    expect(() => parseDot("0.1 outside S1 40, 3 behind FH")).toThrow();
    expect(() => parseDot("2 outside S1 42, 3 behind FH")).toThrow();
  });
});
describe("show checker", () => {
  it("accepts the playable ten-page show", () =>
    expect(checkShow(show)).toEqual([]));
  it("rejects quarter steps, spacing, speed, counts and missing slots", () => {
    const s = structuredClone(show);
    s.pages[0].dots[0].x = 0.1;
    s.pages[0].dots[1] = s.pages[0].dots[2];
    s.maxStep = 0.1;
    s.totalCounts = 2;
    s.performers[5].slot = undefined;
    const e = checkShow(s).join(" ");
    for (const word of ["quarter", "spacing", "step size", "Counts", "slots"])
      expect(e).toContain(word);
  });
  it("detects crossing paths even with separated endpoints", () => {
    const s = structuredClone(show);
    [s.pages[0].dots[0], s.pages[0].dots[1]] = [s.initial[1], s.initial[0]];
    expect(checkShow(s).join()).toContain("crossing");
  });
});
describe("marching", () => {
  it("replays seeded drift and returns smoothly to page arrivals", () => {
    expect(drift(3, 4, 22)).toEqual(drift(3, 4, 22));
    expect(drift(3, 4, 22)).not.toEqual(drift(3, 4, 23));
    expect(
      Math.hypot(
        drift(8, 4, 22).x - target(8, 4).x,
        drift(8, 4, 22).y - target(8, 4).y,
      ),
    ).toBeLessThan(0.2);
  });
  it("has frame-rate-independent movement and scoring", () => {
    const a = new Run(42),
      b = new Run(42);
    a.nudge(1, tempo.seconds(2));
    b.nudge(1, tempo.seconds(2));
    for (let c = 0.01; c < 80; c += 0.01) a.position(c);
    expect(a.position(80)).toEqual(b.position(80));
    expect(a.scores()).toEqual(b.scores());
  });
  it("auto marches and holds, discards misses, penalizes hold actions", () => {
    const r = new Run(1);
    r.position(16);
    const at = r.position(16);
    expect(r.position(24)).toEqual(at);
    expect(r.nudge(1, tempo.seconds(20))).toContain("Hold");
    expect(r.faults).toBe(1);
    const m = new Run(1);
    expect(m.nudge(1, tempo.seconds(2) + 0.2)).toBe("Miss");
    expect(m.queue.size).toBe(0);
  });
  it("maps rushed to current and dragged to next count", () => {
    const r = new Run(1);
    r.nudge(-1, tempo.seconds(3) - 0.1);
    r.nudge(1, tempo.seconds(4) + 0.1);
    expect(r.queue.get(3)).toBe(-1);
    expect(r.queue.get(5)).toBe(1);
  });
  it("fits the actual neighboring form instead of the written dot", () => {
    const count = 4,
      actual = Array.from({ length: 12 }, (_, id) => {
        const p = target(count, id);
        return { x: p.x + 1, y: p.y };
      });
    const p = target(count, PLAYER);
    expect(formError({ x: p.x + 1, y: p.y }, actual, count)).toBe(0);
    expect(formError(p, actual, count)).toBe(1);
  });
});
