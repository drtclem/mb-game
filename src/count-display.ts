import { setStart, type GameShow } from "./repertoire";
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export function countDisplay(
  count: number,
  countIn?: number,
  countoffCounts = 8,
) {
  if (countIn !== undefined && countoffCounts === 4)
    return {
      labels: ["1", "2", "3", "4"],
      active: countIn < 0 ? -1 : Math.min(3, Math.floor(countIn)),
      caption: "RESUME · FOUR COUNTS",
      position:
        countIn < 0 ? "READY" : `${Math.min(4, Math.floor(countIn) + 1)} / 4`,
    };
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
export function moveDisplay(
  show: GameShow,
  count: number,
  countIn?: number,
  countoffCounts = 8,
) {
  const page = show.page(count),
    local = clamp(
      count - setStart(show, page),
      0,
      show.drill.pages[page].counts,
    );
  const describe = (p: number) =>
    p >= show.drill.pages.length
      ? null
      : {
          label: `${show.hold(setStart(show, p)) ? "HOLD" : "MOVE"} · ${show.drill.pages[p].counts} COUNTS`,
          name: show.drill.pages[p].name,
        };
  if (countIn !== undefined)
    return {
      page,
      now: {
        label: `COUNT-IN · ${countoffCounts} BEATS`,
        name: countoffCounts === 4 ? "1, 2, 3, 4" : "5… 6… 5, 6, 7, 8",
      },
      next: describe(page),
      remaining: Math.ceil(countoffCounts - clamp(countIn, 0, countoffCounts)),
      progress: Math.floor(clamp(countIn, 0, 7.99999)),
    };
  return {
    page,
    now: describe(page)!,
    next: describe(page + 1),
    remaining: Math.ceil(show.drill.pages[page].counts - local),
    progress: Math.floor(Math.min(7.99999, local)),
  };
}
