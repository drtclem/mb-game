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
