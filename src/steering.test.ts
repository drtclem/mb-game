import { describe, it, expect } from "vitest";
import { Run, tempo, drift } from "./game";

function clone(run: Run): Run {
  return Object.assign(new Run(run.seed), structuredClone(run));
}
// A deterministic reference player searches the three legal actions, on the
// count, against the same clock/seed. It is test-only, never autoplay in the UI.
function correctiveRun(seed: number) {
  const run = new Run(seed);
  for (let k = 0; k < 80; k++) {
    if (!run.isHold(k)) {
      let best = Infinity,
        action = 0;
      for (const direction of [0, -1, 1]) {
        const candidate = clone(run);
        if (direction) candidate.nudge(direction, tempo.seconds(k));
        const end = Math.min(80, (Math.floor(k / 8) + 1) * 8, k + 3);
        candidate.position(end);
        const score = candidate.scores();
        const cost = -(score.dot + score.form);
        if (cost < best) {
          best = cost;
          action = direction;
        }
      }
      if (action) run.nudge(action, tempo.seconds(k));
    }
    run.position(k + 1);
  }
  return run;
}

describe("step 1 steering acceptance", () => {
  it("on-beat correction beats idle across fixed seeds, not just one lucky rep", () => {
    const results = Array.from({ length: 24 }, (_, seed) => {
      const idle = new Run(seed);
      idle.position(80);
      const active = correctiveRun(seed);
      return {
        seed,
        idle: idle.scores().total,
        active: active.scores().total,
        gain: active.scores().total - idle.scores().total,
      };
    });
    const gains = results.map((r) => r.gain).sort((a, b) => a - b);
    console.info(
      `24-seed steering check: idle mean ${(results.reduce((s, r) => s + r.idle, 0) / 24).toFixed(2)}, corrective mean ${(results.reduce((s, r) => s + r.active, 0) / 24).toFixed(2)}, minimum gain ${gains[0].toFixed(2)}`,
    );
    expect(gains[12]).toBeGreaterThan(10);
    expect(Math.min(...results.map((r) => r.gain))).toBeGreaterThan(3);
  });
  it("band holds remain stationary, including the transition into and out of holds", () => {
    for (const seed of [1, 23, 100])
      for (let id = 0; id < 12; id++) {
        expect(drift(16, id, seed)).toEqual(drift(24, id, seed));
        expect(drift(48, id, seed)).toEqual(drift(56, id, seed));
      }
  });
  it("miss spam cannot improve motion over idle", () => {
    const idle = new Run(42),
      spam = new Run(42);
    for (let k = 0; k < 80; k++) {
      if (!spam.isHold(k)) spam.nudge(1, tempo.seconds(k) + 0.2);
      idle.position(k + 1);
      spam.position(k + 1);
    }
    expect(spam.to).toEqual(idle.to);
    expect(spam.scores().total).toBeLessThan(idle.scores().total);
  });
});
