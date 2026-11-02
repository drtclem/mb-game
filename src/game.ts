import { distance, type Dot } from "./drill";
import { show } from "./show";
import { judge, TempoMap, type Grade } from "./tempo";
export const tempo = TempoMap.steady(112, 88),
  PLAYER = 5;
export const mix = (a: Dot, b: Dot, t: number): Dot => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export function target(count: number, id: number): Dot {
  if (count <= 0) return show.initial[id];
  const page = Math.min(9, Math.floor((count - 1e-8) / 8)),
    p = show.pages[page],
    prev = page ? show.pages[page - 1].dots : show.initial;
  return mix(prev[id], p.dots[id], Math.min(1, (count - page * 8) / 8));
}
export const STEERING = {
  nudgeRadians: 0.16,
  headingRetention: 0.96,
  dotPull: 0.035,
  tendencyRadians: 0.34,
  maxHeading: 0.7,
};

// Spatial drift advances only on move pages; a hold never makes feet slide.
export function drift(count: number, id: number, seed: number): Dot {
  count = Math.max(0, Math.min(80, count));
  let travel = 0;
  for (let page = 0; page < 10; page++) {
    const prev = page ? show.pages[page - 1].dots[id] : show.initial[id];
    if (distance(prev, show.pages[page].dots[id]) > 0)
      travel += Math.max(0, Math.min(8, count - page * 8));
  }
  const base = target(count, id);
  const strength = 0.35 + 0.85 * Math.sin((Math.PI * travel) / 8) ** 2;
  return {
    x:
      base.x +
      Math.sin(seed * 0.17 + travel * 0.045) * 0.9 +
      Math.sin(seed * 1.79 + id * 3.1 + travel * 0.035) * strength,
    y:
      base.y +
      Math.cos(seed * 0.13 + travel * 0.04) * 0.6 +
      Math.cos(seed * 0.93 + id * 1.7 + travel * 0.04) * strength,
  };
}
export function formError(player: Dot, actual: Dot[], count: number) {
  const ids = [3, 4, 6, 7];
  const offset = ids.reduce(
    (a, id) => {
      const ideal = target(count, id);
      return {
        x: a.x + (actual[id].x - ideal.x) / ids.length,
        y: a.y + (actual[id].y - ideal.y) / ids.length,
      };
    },
    { x: 0, y: 0 },
  );
  const ideal = target(count, PLAYER);
  return distance(player, { x: ideal.x + offset.x, y: ideal.y + offset.y });
}
export const accuracy = (steps: number) => 100 * Math.exp(-steps / 1.5);
export class Run {
  seed: number;
  from: Dot;
  to: Dot;
  completed = 0;
  heading = 0;
  queue = new Map<number, number>();
  grades: Grade[] = [];
  faults = 0;
  dot: number[] = [];
  form: number[] = [];
  arrivals: number[] = [];
  constructor(seed: number) {
    this.seed = seed;
    this.from = { ...show.initial[PLAYER] };
    this.to = { ...this.from };
  }
  isHold(count: number) {
    const i = Math.min(9, Math.floor(Math.max(0, count) / 8));
    return (
      distance(
        i ? show.pages[i - 1].dots[PLAYER] : show.initial[PLAYER],
        show.pages[i].dots[PLAYER],
      ) === 0
    );
  }
  nudge(direction: number, seconds: number) {
    const near = tempo.nearest(seconds),
      grade = judge(near.gap);
    if (seconds < 0 || seconds >= tempo.seconds(80)) return "Wait for step-off";
    if (this.isHold(tempo.count(seconds))) {
      this.faults++;
      this.grades.push("Miss");
      return "Hold · stand still";
    }
    this.grades.push(grade);
    if (grade !== "Miss") {
      const step = Math.max(
        this.completed,
        near.count + (near.gap > 0 ? 1 : 0),
      );
      this.queue.set(
        step,
        Math.max(-2, Math.min(2, (this.queue.get(step) ?? 0) + direction)),
      );
    }
    return grade;
  }
  position(count: number): Dot {
    count = Math.max(0, Math.min(80, count));
    while (this.completed < Math.ceil(count)) {
      const k = this.completed;
      this.from = { ...this.to };
      if (k % 8 === 0) this.heading = 0;
      const end = target(Math.min(80, k + 1), PLAYER),
        page = Math.min(9, Math.floor(k / 8));
      const start = page
        ? show.pages[page - 1].dots[PLAYER]
        : show.initial[PLAYER];
      const goal = show.pages[page].dots[PLAYER];
      const step = distance(start, goal) / 8;
      this.heading = Math.max(
        -STEERING.maxHeading,
        Math.min(
          STEERING.maxHeading,
          this.heading * STEERING.headingRetention +
            (this.queue.get(k) ?? 0) * STEERING.nudgeRadians,
        ),
      );
      this.queue.delete(k);
      if (step > 0) {
        const angle =
          Math.atan2(goal.y - this.from.y, goal.x - this.from.x) +
          this.heading +
          STEERING.tendencyRadians *
            (Math.sin(this.seed * 1.71 + page * 0.3) >= 0 ? 1 : -1);
        const moved = {
          x: this.from.x + Math.cos(angle) * step,
          y: this.from.y + Math.sin(angle) * step,
        };
        this.to = mix(moved, end, STEERING.dotPull);
      } else this.to = { ...this.from };
      this.completed++;
      const actual = Array.from({ length: 12 }, (_, id) =>
        drift(this.completed, id, this.seed),
      );
      const d = distance(this.to, target(this.completed, PLAYER));
      this.dot.push(accuracy(d));
      this.form.push(accuracy(formError(this.to, actual, this.completed)));
      if (this.completed % 8 === 0) this.arrivals.push(accuracy(d));
    }
    return mix(this.from, this.to, count - (this.completed - 1));
  }
  scores() {
    const avg = (a: number[]) =>
      a.length ? a.reduce((s, v) => s + v, 0) / a.length : 100;
    const dot = avg(this.dot) * 0.25 + avg(this.arrivals) * 0.75,
      form = avg(this.form),
      timing = this.grades.length
        ? avg(
            this.grades.map((g) =>
              g === "Perfect" ? 100 : g === "Good" ? 80 : g === "Miss" ? 0 : 45,
            ),
          )
        : 100;
    const band = 88 + Math.sin(this.seed) * 5;
    return {
      dot,
      form,
      timing,
      band,
      total: Math.max(
        0,
        (dot * 0.5 + form * 0.5) * (0.85 + timing * 0.0015) * 0.95 +
          band * 0.05 -
          this.faults * 0.5,
      ),
    };
  }
}
