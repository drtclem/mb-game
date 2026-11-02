/** Explicit beat times also support beat-tracked music and changing meters. */
export class TempoMap {
  constructor(
    readonly beats: number[],
    readonly meters: { count: number; beats: number }[] = [
      { count: 0, beats: 4 },
    ],
  ) {
    if (
      beats.length < 2 ||
      beats.some((t, i) => !Number.isFinite(t) || (i > 0 && t <= beats[i - 1]))
    )
      throw Error("Beat times must increase");
  }
  static steady(bpm: number, counts: number) {
    if (bpm <= 0) throw Error("Invalid tempo");
    return new TempoMap(
      Array.from({ length: counts + 1 }, (_, i) => (i * 60) / bpm),
    );
  }
  seconds(count: number): number {
    const i = Math.min(this.beats.length - 2, Math.max(0, Math.floor(count)));
    return this.beats[i] + (count - i) * (this.beats[i + 1] - this.beats[i]);
  }
  count(seconds: number): number {
    let lo = 0,
      hi = this.beats.length - 1;
    while (lo + 1 < hi) {
      const m = (lo + hi) >> 1;
      if (this.beats[m] <= seconds) lo = m;
      else hi = m;
    }
    return (
      lo + (seconds - this.beats[lo]) / (this.beats[lo + 1] - this.beats[lo])
    );
  }
  nearest(seconds: number) {
    const count = Math.round(this.count(seconds));
    return { count, gap: seconds - this.seconds(count) };
  }
  counter(count: number) {
    const m =
      [...this.meters].reverse().find((m) => count >= m.count) ??
      this.meters[0];
    return (
      ((((Math.floor(count) - m.count) % m.beats) + m.beats) % m.beats) + 1
    );
  }
}
export type Grade = "Perfect" | "Good" | "Rushing" | "Dragging" | "Miss";
export function judge(gap: number): Grade {
  const ms = Math.abs(gap) * 1000;
  return ms <= 45.00001
    ? "Perfect"
    : ms <= 90.00001
      ? "Good"
      : ms <= 150.00001
        ? gap < 0
          ? "Rushing"
          : "Dragging"
        : "Miss";
}
export function calibrationOffset(gaps: number[]) {
  if (!gaps.length) return 0;
  const sorted = [...gaps].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
