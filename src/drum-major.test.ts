import { describe, it, expect } from "vitest";
import { conductingPose } from "./drum-major";
import { countDisplay } from "./count-display";
import { shows } from "./repertoire";
describe("4/4 conducting on the music clock", () => {
  it("lands down, inward, outward and up on beats 1, 2, 3 and 4", () => {
    const [down, inside, outside, up] = [0, 1, 2, 3].map(conductingPose);
    expect(down.y).toBeGreaterThan(inside.y);
    expect(inside.x).toBeGreaterThan(outside.x);
    expect(inside.y).toBe(outside.y);
    expect(up.y).toBeLessThan(inside.y);
    expect(conductingPose(4)).toEqual(down);
  });
  it("stays aligned to the highlighted beat through tempo changes and count-in", () => {
    for (const show of shows)
      for (const c of [0, 1, 2, 3, 4, 31, 32, 63, 64, 95, 96, 111]) {
        const count = show.tempo.count(show.tempo.seconds(c));
        expect(conductingPose(count).beat).toBe(countDisplay(count).active);
      }
    for (let c = 0; c < 8; c++)
      expect(conductingPose(c).beat).toBe(countDisplay(0, c).active);
  });
});
