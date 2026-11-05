import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { shows } from "./repertoire";
import { checkShow } from "./drill";
describe("playable show and music alignment", () => {
  for (const [index, show] of shows.entries())
    it(show.name, () => {
      expect(checkShow(show.drill)).toEqual([]);
      const score = JSON.parse(
        readFileSync(
          `public/music/${index ? "sunrise-reprise-score" : "sunrise-score"}.json`,
          "utf8",
        ),
      );
      expect(score.totalCounts).toBe(show.drill.totalCounts);
      for (let c = 0; c <= 112; c++)
        expect(show.tempo.seconds(c)).toBeCloseTo(score.beats[c], 6);
      for (const section of score.sections)
        for (let c = section.start; c < section.end; c++)
          expect(show.hold(c)).toBe(section.action === "HOLD");
      expect(readFileSync(`public${show.audio}`).length).toBeGreaterThan(
        1000000,
      );
      for (const page of show.drill.pages)
        for (let i = 4; i < 7; i++)
          expect(
            Math.hypot(
              page.dots[i].x - page.dots[i + 1].x,
              page.dots[i].y - page.dots[i + 1].y,
            ),
          ).toBeLessThan(6);
    });
});

import { turnStudy, setStart, setEnd } from "./repertoire";
import { PerformanceRun } from "./performance";
import { moveDisplay } from "./count-display";
it("keeps the 8 / 4 turn trial aligned to the original music clock", () => {
  expect(checkShow(turnStudy.drill)).toEqual([]);
  expect(turnStudy.drill.pages.slice(0, 3).map((p) => p.counts)).toEqual([
    8, 4, 8,
  ]);
  expect(turnStudy.hold(7.99)).toBe(false);
  expect(turnStudy.hold(8)).toBe(true);
  expect(turnStudy.hold(11.99)).toBe(true);
  expect(turnStudy.hold(12)).toBe(false);
  expect(turnStudy.drill.pages[2].dots[0].x).toBeGreaterThan(
    shows[0].drill.pages[2].dots[0].x,
  );
  expect(setStart(turnStudy, 2)).toBe(12);
  expect(setEnd(turnStudy, 2)).toBe(20);
  expect(moveDisplay(turnStudy, 10).remaining).toBe(2);
  expect(moveDisplay(turnStudy, 10).now.label).toBe("HOLD · 4 COUNTS");
  for (let c = 0; c <= 112; c++)
    expect(turnStudy.tempo.seconds(c)).toBeCloseTo(c * 0.5, 6);
  const run = new PerformanceRun(turnStudy, "Medium", 5, 1);
  run.marchAutomatically(18.9, { forward: 1, side: 0 });
  expect(run.steps).toHaveLength(16);
  expect(
    run.steps.filter((s) => s.timingBeat! >= 8 && s.timingBeat! < 12),
  ).toHaveLength(0);
});
it("renders the 120 BPM challenge music to the same beat grid as its diagonal and curved drill", () => {
  const score = JSON.parse(
    readFileSync("public/music/sunrise-challenge-score.json", "utf8"),
  );
  for (let c = 0; c <= 112; c++)
    expect(turnStudy.tempo.seconds(c)).toBeCloseTo(score.beats[c]);
  for (const section of score.sections)
    for (let c = section.start; c < section.end; c++)
      expect(turnStudy.hold(c)).toBe(section.action === "HOLD");
  expect(readFileSync(`public${turnStudy.audio}`).length).toBeGreaterThan(
    1000000,
  );
  expect(
    turnStudy.drill.pages.some(
      (p, i) =>
        i > 0 &&
        p.dots.some(
          (d, j) =>
            d.x !== turnStudy.drill.pages[i - 1].dots[j].x &&
            d.y !== turnStudy.drill.pages[i - 1].dots[j].y,
        ),
    ),
  ).toBe(true);
});

import { challengeTurn } from "./repertoire";
it("scripts one later right turn, lasting four counts", () => {
  expect(challengeTurn.direction).toBe(-1);
  expect(challengeTurn.counts).toBe(4);
  expect(setStart(turnStudy, challengeTurn.page)).toBe(64);
  expect(setStart(turnStudy, challengeTurn.page)).toBeGreaterThan(
    turnStudy.drill.totalCounts / 2,
  );
  expect(turnStudy.hold(setStart(turnStudy, challengeTurn.page))).toBe(true);
});
