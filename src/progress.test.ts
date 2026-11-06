import { beforeEach, describe, it, expect, vi } from "vitest";
import { readProgress, recordResult } from "./progress";
describe("browser-local progression", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
    });
  });
  it("unlocks every show for judging, with or without saved progress", () => {
    expect(readProgress().unlocked).toEqual(["sunrise", "reprise"]);
    recordResult("sunrise", "Easy", 40, true);
    expect(readProgress().unlocked).toEqual(["sunrise", "reprise"]);
  });
  it("keeps separate bests and never replaces a higher score", () => {
    recordResult("sunrise", "Easy", 80, true);
    recordResult("sunrise", "Easy", 70, true);
    recordResult("sunrise", "Hard", 60, true);
    expect(readProgress().best).toEqual({
      "sunrise:Easy": 80,
      "sunrise:Hard": 60,
    });
  });
});
