import { describe, it, expect } from "vitest";
import { shows } from "./repertoire";
import { nextMovePreview } from "./next-move";
const show = shows[0];
describe("three-count destination preview", () => {
  it("shows 3, 2, 1 before a move and hides at its exact start", () => {
    expect(nextMovePreview(show, 4.99, 5)).toBeNull();
    for (const [count, left] of [
      [5, 3],
      [6, 2],
      [7.9, 1],
    ])
      expect(nextMovePreview(show, count, 5)).toMatchObject({
        start: 8,
        countdown: left,
        dot: show.goal(8)[5],
      });
    expect(nextMovePreview(show, 8, 5)).toBeNull();
  });
  it("previews consecutive moves but never previews a hold or changes the active goal", () => {
    const goal = structuredClone(show.goal(21));
    expect(nextMovePreview(show, 13, 5)?.start).toBe(16);
    expect(nextMovePreview(show, 21, 5)).toBeNull();
    expect(nextMovePreview(show, 29, 5)?.start).toBe(32);
    expect(nextMovePreview(show, 109, 5)).toBeNull();
    expect(show.goal(21)).toEqual(goal);
  });
});
