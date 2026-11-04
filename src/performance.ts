import { distance, type Dot } from "./drill";
import { judge } from "./tempo";
import { type Difficulty, type GameShow, tuning } from "./repertoire";
export type Steering = { forward: number; side: number; aim?: Dot };
export type Step = {
  seconds: number;
  end: number;
  from: Dot;
  visualFrom?: Dot;
  to: Dot;
  size: number;
  page: number;
  number: number;
  timing: number;
  timingBeat?: number;
  synthetic?: boolean;
  stepOff?: boolean;
  direction: number;
  sizeError: number;
  hold: boolean;
  backward: boolean;
};
export type Sample = {
  page: number;
  dot: number;
  rawDot: number;
  form: number;
  spacing: number;
  shape: number;
  discount: number;
};
export type Result = {
  total: number;
  dot: number;
  form: number;
  timing: number;
  stepSize: number;
  direction: number;
  technique: number;
  faults: number;
  misses: number;
  extra: number;
  averageStep: number;
  maxStep: number;
  sets: {
    name: string;
    dot: number;
    form: number;
    timing: number;
    stepSize: number;
    direction: number;
    distance: number;
    faults: number;
    misses: number;
    extra: number;
    discount: number;
  }[];
};
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const accuracy = (error: number) => 100 * Math.exp(-error / 0.85);
const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
export function formMetrics(
  player: Dot,
  actual: Dot[],
  ideal: Dot[],
  id: number,
) {
  const ids = ideal
    .map((_, i) => i)
    .filter((i) => i !== id)
    .sort(
      (a, b) => distance(ideal[a], ideal[id]) - distance(ideal[b], ideal[id]),
    )
    .slice(0, 4);
  // Fit local displacement and slope against written rank/curve, leaving self out.
  const weights = ids.map((i) => 1 / Math.max(1, Math.abs(i - id)));
  const fit = (axis: "x" | "y") => {
    let w = 0,
      sx = 0,
      sy = 0,
      sxx = 0,
      sxy = 0;
    ids.forEach((i, j) => {
      const x = i - id,
        y = clamp(actual[i][axis] - ideal[i][axis], -1.5, 1.5),
        a = weights[j];
      w += a;
      sx += a * x;
      sy += a * y;
      sxx += a * x * x;
      sxy += a * x * y;
    });
    return clamp((sy * sxx - sx * sxy) / (w * sxx - sx * sx || 1), -1.5, 1.5);
  };
  const shift = { x: fit("x"), y: fit("y") },
    reference = { x: ideal[id].x + shift.x, y: ideal[id].y + shift.y };
  const spacing = mean(
    ids
      .slice(0, 2)
      .map((i) =>
        Math.abs(distance(player, actual[i]) - distance(ideal[id], ideal[i])),
      ),
  );
  const shape = distance(player, reference),
    raw = distance(player, ideal[id]),
    shiftLength = Math.hypot(shift.x, shift.y);
  const projection = shiftLength
    ? ((player.x - ideal[id].x) * shift.x +
        (player.y - ideal[id].y) * shift.y) /
      shiftLength
    : 0;
  // Only the displacement toward the fitted form qualifies, and only if closer to it.
  const eligible =
    shape < shiftLength
      ? Math.min(raw, shiftLength, Math.max(0, projection))
      : 0;
  return { spacing, shape, eligible, reference, raw };
}
export class PerformanceRun {
  steps: Step[] = [];
  samples: Sample[] = [];
  faults = 0;
  sampled = 0;
  incomplete = false;
  steeringBias = 0;
  private steeringPage = -1;
  remote = new Map<number, Dot>();
  constructor(
    readonly show: GameShow,
    readonly difficulty: Difficulty,
    readonly player: number,
    readonly seed: number,
  ) {}
  position(count: number): Dot {
    const sec = this.show.tempo.seconds(Math.max(0, count));
    let lo = 0,
      hi = this.steps.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.steps[mid].seconds <= sec) lo = mid + 1;
      else hi = mid;
    }
    const step = this.steps[lo - 1];
    if (!step) return { ...this.show.drill.initial[this.player] };
    const t = clamp((sec - step.seconds) / (step.end - step.seconds), 0, 1);
    const from = step.visualFrom ?? step.from;
    return {
      x: from.x + (step.to.x - from.x) * t,
      y: from.y + (step.to.y - from.y) * t,
    };
  }
  ai(count: number, id: number): Dot {
    let travel = 0;
    for (let p = 0; p < 14; p++)
      if (!this.show.hold(p * 8)) travel += clamp(count - p * 8, 0, 8);
    const factor = { Easy: 0.2, Medium: 0.55, Hard: 1 }[this.difficulty],
      rate = { Easy: 0.08, Medium: 0.15, Hard: 0.25 }[this.difficulty];
    const ideal = this.show.target(Math.max(0, count))[id];
    const phase = this.seed * 0.31 + id * 2.73;
    const envelope = Math.min(1, travel / 4);
    return {
      x:
        ideal.x +
        factor *
          envelope *
          (Math.sin(phase + travel * rate) +
            0.25 * Math.sin(phase * 3 + travel * rate * 2)),
      y:
        ideal.y +
        factor * envelope * 0.7 * Math.cos(phase * 1.9 + travel * rate),
    };
  }
  actual(count: number): Dot[] {
    return this.show.drill.performers.map((_, i) =>
      i === this.player
        ? this.position(count)
        : (this.remote.get(i) ?? this.ai(count, i)),
    );
  }
  advance(count: number) {
    const end = Math.min(112, Math.max(0, count));
    while (this.sampled < Math.floor(end + 1e-8)) {
      const c = ++this.sampled,
        page = this.show.page(c - 1e-6),
        actual = this.actual(c),
        ideal = this.show.target(c),
        m = formMetrics(actual[this.player], actual, ideal, this.player);
      this.samples.push({
        page,
        dot: accuracy(m.raw - tuning.formDiscount * m.eligible),
        rawDot: m.raw,
        form:
          tuning.spacingWeight * accuracy(m.spacing) +
          (1 - tuning.spacingWeight) * accuracy(m.shape),
        spacing: m.spacing,
        shape: m.shape,
        discount: m.eligible * tuning.formDiscount,
      });
    }
  }
  tap(
    seconds: number,
    input: Steering,
    timingOffset = 0,
    steeringMode: "nudge" | "tilt" = "nudge",
  ) {
    const actualCount = this.show.tempo.count(seconds);
    if (actualCount < 0 || actualCount >= this.show.drill.totalCounts) return;
    // Good/Perfect taps belong to the nearest beat, including just before a set boundary.
    const beat = this.show.tempo.nearest(seconds);
    const count = Math.abs(beat.gap) <= 0.09000001 ? beat.count : actualCount;
    if (count >= this.show.drill.totalCounts) return;
    this.advance(actualCount);
    const page = this.show.page(count),
      hold = this.show.hold(count),
      visualFrom = this.position(actualCount),
      from = this.steps.at(-1)?.to ?? visualFrom,
      goal = this.show.goal(count)[this.player];
    const previous = page
      ? this.show.drill.pages[page - 1].dots[this.player]
      : this.show.drill.initial[this.player];
    const written = { x: goal.x - previous.x, y: goal.y - previous.y },
      nominal = Math.hypot(written.x, written.y) / 8;
    const backward = this.show.backward(count),
      correct = backward ? -1 : 1;
    const forward = clamp(input.forward, -1, 1),
      side = clamp(input.side, -1, 1);
    let dx = goal.x - from.x,
      dy = goal.y - from.y,
      len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      dx = written.x;
      dy = written.y;
      len = Math.hypot(dx, dy) || 1;
    }
    dx /= len;
    dy /= len;
    if (page !== this.steeringPage) {
      this.steeringBias = 0;
      this.steeringPage = page;
    }
    if (!hold)
      this.steeringBias =
        steeringMode === "tilt"
          ? side * tuning.steerRadians
          : clamp(
              this.steeringBias + side * tuning.steerNudge,
              -tuning.steerRadians,
              tuning.steerRadians,
            );
    const sign = forward * correct,
      angle = this.steeringBias;
    let vx =
        dx * Math.cos(angle) * sign +
        Math.abs(dy) * Math.sin(angle) * Math.abs(forward),
      vy =
        dy * Math.cos(angle) * sign -
        Math.sign(dy || -1) * dx * Math.sin(angle) * Math.abs(forward);
    if (input.aim) {
      const length = Math.hypot(input.aim.x, input.aim.y);
      vx = length > 0.001 ? input.aim.x / length : 0;
      vy = length > 0.001 ? input.aim.y / length : 0;
    }
    let size =
      Math.abs(forward) > 0.1
        ? Math.min(
            tuning.maxStep,
            Math.hypot(goal.x - from.x, goal.y - from.y) /
              Math.max(1, page * 8 + 8 - Math.floor(count)),
          )
        : 0;
    if (hold) size = 0.12;
    let to = { x: from.x + vx * size, y: from.y + vy * size };
    if (hold) {
      this.faults++;
      to = { ...from };
    }
    to = { x: clamp(to.x, -79, 79), y: clamp(to.y, 1, 84) };
    size = distance(from, to);
    const metrics = formMetrics(
      to,
      this.actual(count),
      this.show.target(count),
      this.player,
    );
    const idealDir = { x: goal.x - from.x, y: goal.y - from.y };
    const unadjustedError = Math.abs(
      Math.atan2(
        dx * (to.y - from.y) - dy * (to.x - from.x),
        dx * (to.x - from.x) + dy * (to.y - from.y),
      ),
    );
    const direction =
      metrics.eligible > 0 && unadjustedError < tuning.steerRadians + 0.01
        ? 0
        : Math.abs(
            Math.atan2(
              idealDir.x * (to.y - from.y) - idealDir.y * (to.x - from.x),
              idealDir.x * (to.x - from.x) + idealDir.y * (to.y - from.y),
            ),
          );
    const last = this.steps.at(-1),
      interval = last ? seconds - last.seconds : 60 / 84;
    const duration = clamp(
      interval * 0.85,
      0.07,
      Math.min(0.65, (this.show.tempo.seconds(count + 1) - seconds) * 0.85),
    );
    const gap = Math.abs(this.show.tempo.nearest(seconds - timingOffset).gap),
      timing =
        judge(gap) === "Perfect"
          ? 100
          : judge(gap) === "Good"
            ? 80
            : gap <= 0.15
              ? 45
              : 0;
    const startSeconds = Math.max(seconds, this.show.tempo.seconds(page * 8));
    this.steps.push({
      stepOff:
        !hold &&
        page > 0 &&
        this.show.hold(page * 8 - 0.001) &&
        !this.steps.some((s) => s.page === page && !s.synthetic),
      seconds: startSeconds,
      end: Math.min(
        startSeconds + duration,
        this.show.tempo.seconds((page + 1) * 8),
      ),
      from: { ...from },
      visualFrom: startSeconds > seconds ? { ...from } : visualFrom,
      to,
      size,
      page,
      number: this.steps.length,
      timing,
      timingBeat: Math.round(this.show.tempo.count(seconds - timingOffset)),
      direction: forward === 0 && !hold ? Math.PI / 2 : direction,
      sizeError: hold
        ? size
        : Math.max(
            0,
            Math.abs(size - nominal) - (metrics.eligible > 0 ? 0.15 : 0),
          ),
      hold,
      backward: forward < 0,
    });
  }
  heading(count: number) {
    if (this.show.hold(count)) return { x: 0, y: 0 };
    const from = this.position(count),
      goal = this.show.goal(count)[this.player];
    let x = goal.x - from.x,
      y = goal.y - from.y;
    if (Math.hypot(x, y) < 0.001) return { x: 0, y: 0 };
    const length = Math.hypot(x, y);
    x /= length;
    y /= length;
    const angle =
      this.show.page(count) === this.steeringPage ? this.steeringBias : 0;
    return {
      x: x * Math.cos(angle) + Math.abs(y) * Math.sin(angle),
      y: y * Math.cos(angle) - Math.sign(y || -1) * x * Math.sin(angle),
    };
  }
  results(): Result {
    const intended = (page: number) => (this.show.hold(page * 8) ? 0 : 8);
    const set = this.show.drill.pages.map((p, page) => {
      const samples = this.samples.filter((s) => s.page === page),
        steps = this.steps.filter((s) => s.page === page && !s.synthetic),
        moving = steps.filter((s) => !s.hold);
      const byBeat = new Map<number, number>();
      for (const step of moving) {
        const beat =
          step.timingBeat ?? Math.round(this.show.tempo.count(step.seconds));
        if (beat >= page * 8 && beat < (page + 1) * 8)
          byBeat.set(beat, Math.max(byBeat.get(beat) ?? 0, step.timing));
      }
      const expected = intended(page),
        extra = Math.max(0, moving.length - byBeat.size),
        misses = expected - byBeat.size;
      const timing = expected
        ? clamp(
            [...byBeat.values()].reduce((a, b) => a + b, 0) / expected -
              extra * 8,
            0,
            100,
          )
        : 100;
      return {
        name: p.name,
        dot: mean(samples.map((s) => s.dot)),
        form: mean(samples.map((s) => s.form)),
        timing,
        stepSize: expected
          ? mean(moving.map((s) => 100 * Math.exp(-s.sizeError * 2)))
          : 100,
        direction: expected
          ? mean(moving.map((s) => 100 * Math.exp(-s.direction * 2)))
          : 100,
        distance: mean(samples.map((s) => s.rawDot)) * 22.5,
        faults: steps.filter((s) => s.hold).length,
        misses,
        extra,
        discount: mean(samples.map((s) => s.discount)) * 22.5,
      };
    });
    const move = set.filter((_, i) => !this.show.hold(i * 8)),
      timing = mean(move.map((s) => s.timing)),
      stepSize = mean(move.map((s) => s.stepSize)),
      direction = mean(move.map((s) => s.direction));
    const dot = mean(set.map((s) => s.dot)),
      form = mean(set.map((s) => s.form)),
      technique = clamp(
        (100 - timing) * tuning.timingPenalty +
          (100 - stepSize) * tuning.sizePenalty +
          (100 - direction) * tuning.directionPenalty +
          this.faults * tuning.holdPenalty,
        0,
        60,
      );
    return {
      total: Math.max(
        0,
        dot * tuning.dotWeight + form * (1 - tuning.dotWeight) - technique,
      ),
      dot,
      form,
      timing,
      stepSize,
      direction,
      technique,
      faults: this.faults,
      misses: move.reduce((s, p) => s + p.misses, 0),
      extra: move.reduce((s, p) => s + p.extra, 0),
      averageStep:
        mean(
          this.steps.filter((s) => !s.hold && !s.synthetic).map((s) => s.size),
        ) * 22.5,
      maxStep:
        Math.max(
          0,
          ...this.steps.filter((s) => !s.synthetic).map((s) => s.size),
        ) * 22.5,
      sets: set,
    };
  }
}
