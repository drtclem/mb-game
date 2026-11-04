import type { GameShow } from "./repertoire";
/** Only an upcoming move gets a preview; holds and already-active dots do not. */
export function nextMovePreview(
  show: GameShow,
  count: number,
  player: number,
  lead = 3,
) {
  if (count < 0) return null;
  let start = 0;
  for (let page = 0; page < show.drill.pages.length; page++) {
    const until = start - count;
    if (until > 0 && !show.hold(start)) {
      if (until > lead) return null;
      return {
        page,
        start,
        countdown: Math.ceil(until),
        dot: show.drill.pages[page].dots[player],
        name: show.drill.pages[page].name,
      };
    }
    start += show.drill.pages[page].counts;
  }
  return null;
}
