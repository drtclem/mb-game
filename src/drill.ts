export type Dot = { x: number; y: number };
export const STEP_INCHES = 22.5,
  FRONT_HASH = 32;
const quarter = (v: number) => Math.abs(v * 4 - Math.round(v * 4)) < 1e-7;
export function formatDot(d: Dot): string {
  const side = d.x < 0 ? "S1" : "S2",
    abs = Math.abs(d.x),
    line = Math.min(10, Math.round(abs / 8)),
    delta = abs - line * 8;
  return `${Math.abs(delta)} ${delta >= 0 ? "outside" : "inside"} ${side} ${50 - line * 5}, ${Math.abs(d.y - FRONT_HASH)} ${d.y >= FRONT_HASH ? "behind" : "in front of"} FH`;
}
export function parseDot(text: string): Dot {
  const m = text
    .trim()
    .match(
      /^(\d+(?:\.\d+)?) (outside|inside) S([12]) (\d+), (\d+(?:\.\d+)?) (behind|in front of) FH$/i,
    );
  if (!m) throw Error("Use: 2 outside S1 40, 3 behind FH");
  const [, offset, dir, side, yard, depth, front] = m;
  const y = Number(yard);
  if (y < 0 || y > 50 || y % 5) throw Error("Yard line must be 0–50 in fives");
  const magnitude =
    ((50 - y) / 5) * 8 +
    (dir.toLowerCase() === "outside" ? 1 : -1) * Number(offset);
  const dot = {
    x: (side === "1" ? -1 : 1) * magnitude,
    y: FRONT_HASH + (front.toLowerCase() === "behind" ? 1 : -1) * Number(depth),
  };
  if (magnitude < 0 || !quarter(dot.x) || !quarter(dot.y))
    throw Error("Dots require quarter steps");
  return dot;
}
export const distance = (a: Dot, b: Dot) => Math.hypot(a.x - b.x, a.y - b.y);
export type Page = {
  name: string;
  counts: number;
  facing: "front" | "toward dot" | "backfield";
  form: "line" | "arc" | "block";
  dots: Dot[];
};
export type Show = {
  performers: { id: string; slot?: "player1" | "player2" }[];
  initial: Dot[];
  pages: Page[];
  totalCounts: number;
  minSpacing: number;
  maxStep: number;
};
export function checkShow(show: Show): string[] {
  const errors: string[] = [];
  const n = show.performers.length;
  if (
    !["player1", "player2"].every(
      (s) => show.performers.filter((p) => p.slot === s).length === 1,
    )
  )
    errors.push("Exactly two player slots required");
  if (new Set(show.performers.map((p) => p.id)).size !== n)
    errors.push("Duplicate performer IDs");
  if (show.pages.reduce((s, p) => s + p.counts, 0) !== show.totalCounts)
    errors.push("Counts do not match music");
  let prev = show.initial;
  let neighbors = 0;
  for (const [pageIndex, p] of show.pages.entries()) {
    const tag = `Page ${pageIndex + 1}`;
    if (p.counts !== 8) errors.push(`${tag}: pages must be 8 counts`);
    if (p.dots.length !== n || prev.length !== n) {
      errors.push(`${tag}: missing dots`);
      prev = p.dots;
      continue;
    }
    for (let i = 0; i < n; i++) {
      const d = p.dots[i];
      if (
        !Number.isFinite(d.x) ||
        !Number.isFinite(d.y) ||
        !quarter(d.x) ||
        !quarter(d.y)
      )
        errors.push(`${tag}: quarter steps required`);
      if (Math.abs(d.x) > 80 || d.y < 0 || d.y > 85.3334)
        errors.push(`${tag}: outside field`);
      if (distance(prev[i], d) / p.counts > show.maxStep + 1e-8)
        errors.push(`${tag}: impossible step size`);
      for (let j = 0; j < i; j++) {
        const rx = prev[i].x - prev[j].x,
          ry = prev[i].y - prev[j].y;
        const vx = d.x - p.dots[j].x - rx,
          vy = d.y - p.dots[j].y - ry;
        const t = Math.max(
          0,
          Math.min(1, -(rx * vx + ry * vy) / (vx * vx + vy * vy || 1)),
        );
        if (Math.hypot(rx + t * vx, ry + t * vy) < show.minSpacing - 1e-8)
          errors.push(`${tag}: spacing / crossing ${i},${j}`);
      }
    }
    const a = show.performers.findIndex((p) => p.slot === "player1"),
      b = show.performers.findIndex((p) => p.slot === "player2");
    if (a >= 0 && b >= 0 && distance(p.dots[a], p.dots[b]) <= 6) neighbors++;
    prev = p.dots;
  }
  if (neighbors < show.pages.length / 2)
    errors.push("Players must stay neighbors for most pages");
  return errors;
}
