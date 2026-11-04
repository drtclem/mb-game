import { shows, tuning, type Difficulty } from "./repertoire";
export type Progress = { best: Record<string, number>; unlocked: string[] };
export function readProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem("mb-progress") ?? "null");
    if (p && p.best && Array.isArray(p.unlocked)) return p;
  } catch {}
  return { best: {}, unlocked: [shows[0].id] };
}
export function recordResult(
  show: string,
  difficulty: Difficulty,
  score: number,
  complete: boolean,
) {
  const p = readProgress();
  if (!complete) return p;
  const key = `${show}:${difficulty}`;
  p.best[key] = Math.max(p.best[key] ?? 0, score);
  if (score >= tuning.unlock) {
    const next = shows[shows.findIndex((s) => s.id === show) + 1];
    if (next && !p.unlocked.includes(next.id)) p.unlocked.push(next.id);
  }
  try {
    localStorage.setItem("mb-progress", JSON.stringify(p));
  } catch {}
  return p;
}
