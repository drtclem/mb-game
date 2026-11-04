import type { GameShow } from "./repertoire";
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export function countDisplay(count: number, countIn?: number) {
  if (countIn !== undefined) {
    const beat = Math.floor(countIn),
      second = beat >= 4;
    return {
      labels: second ? ["5", "6", "7", "8"] : ["5", "…", "6", "…"],
      active: beat < 0 ? -1 : Math.min(7, beat) % 4,
      caption: second ? "COUNT-IN · FINAL FOUR" : "COUNT-IN · FIRST FOUR",
      position: beat < 0 ? "READY" : `${Math.min(8, beat + 1)} / 8`,
    };
  }
  const local = clamp(count % 8, 0, 7.99999),
    beat = Math.floor(local);
  return {
    labels: ["1", "2", "3", "4"],
    active: beat % 4,
    caption: beat < 4 ? "FIRST FOUR" : "SECOND FOUR",
    position: `${beat + 1} / 8`,
  };
}
export function moveDisplay(show: GameShow, count: number, countIn?: number) {
  const page = show.page(count),
    local = clamp(count - page * 8, 0, 8);
  const describe = (p: number) =>
    p >= show.drill.pages.length
      ? null
      : {
          label: `${show.hold(p * 8) ? "HOLD" : "MOVE"} · ${show.drill.pages[p].counts} COUNTS`,
          name: show.drill.pages[p].name,
        };
  if (countIn !== undefined)
    return {
      page,
      now: { label: "COUNT-IN · 8 BEATS", name: "5… 6… 5, 6, 7, 8" },
      next: describe(page),
      remaining: Math.ceil(8 - clamp(countIn, 0, 8)),
      progress: Math.floor(clamp(countIn, 0, 7.99999)),
    };
  return {
    page,
    now: describe(page)!,
    next: describe(page + 1),
    remaining: Math.ceil(8 - local),
    progress: Math.floor(Math.min(7.99999, local)),
  };
}
