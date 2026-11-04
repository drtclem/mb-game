import type { GameShow } from "./repertoire";
export class Playback {
  context = new AudioContext();
  private buffers = new Map<string, AudioBuffer>();
  private source?: AudioBufferSourceNode;
  private clicks: OscillatorNode[] = [];
  gain = this.context.createGain();
  origin = 0;
  frozen = 0;
  paused = false;
  resumeUntil = 0;
  countoffAt = 0;
  private countoffAnchor = 0;
  rejoining = false;
  show?: GameShow;
  constructor() {
    this.gain.connect(this.context.destination);
  }
  async prepare(show: GameShow) {
    await this.context.resume();
    if (!this.buffers.has(show.id)) {
      const response = await fetch(show.audio);
      if (!response.ok) throw Error("Music could not load. Please retry.");
      this.buffers.set(
        show.id,
        await this.context.decodeAudioData(await response.arrayBuffer()),
      );
    }
  }
  start(show: GameShow, delay = 0) {
    this.show = show;
    this.paused = false;
    this.frozen = 0;
    this.rejoining = false;
    this.schedule(0, delay);
  }
  private schedule(offset: number, delay = 0) {
    this.source?.stop();
    this.countoffAnchor = 0;
    const show = this.show!,
      lead = show.tempo.seconds(8);
    this.countoffAt = this.context.currentTime + Math.max(0, delay) + 0.15;
    this.resumeUntil = this.countoffAt + lead;
    this.origin = this.resumeUntil - offset;
    const source = this.context.createBufferSource();
    source.buffer = this.buffers.get(show.id)!;
    source.connect(this.gain);
    source.start(this.resumeUntil, offset);
    this.source = source;
    for (const count of [0, 2, 4, 5, 6, 7])
      this.click(
        this.countoffAt + show.tempo.seconds(count),
        count === 0 || count === 4,
      );
  }
  click(when: number, strong = false) {
    const o = this.context.createOscillator(),
      g = this.context.createGain();
    o.frequency.value = strong ? 1000 : 700;
    g.gain.setValueAtTime(0.08, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
    o.connect(g).connect(this.gain);
    o.start(when);
    o.stop(when + 0.05);
    this.clicks.push(o);
    o.onended = () => {
      this.clicks = this.clicks.filter((x) => x !== o);
    };
  }
  get seconds() {
    return this.paused
      ? this.frozen
      : this.context.currentTime < this.resumeUntil &&
          this.frozen > 0 &&
          !this.rejoining
        ? this.frozen
        : this.context.currentTime - this.origin;
  }
  get countingIn() {
    return !this.paused && this.context.currentTime < this.resumeUntil;
  }
  get countoffProgress() {
    if (!this.show) return -1;
    return (
      this.show.tempo.count(
        this.show.tempo.seconds(this.countoffAnchor) +
          this.context.currentTime -
          this.countoffAt,
      ) - this.countoffAnchor
    );
  }
  get countoff() {
    const c = Math.floor(this.countoffProgress);
    return (
      (
        { 0: "5", 2: "6", 4: "5", 5: "6", 6: "7", 7: "8" } as Record<
          number,
          string
        >
      )[c] ?? "·"
    );
  }
  pause() {
    const frozen = Math.max(0, this.seconds);
    this.stop();
    this.frozen = frozen;
    this.paused = true;
  }
  resume() {
    this.rejoining = false;
    this.paused = false;
    this.schedule(this.frozen);
  }
  /** Rejoin the still-running clock; the lead-in must not delay the show. */
  rejoin(elapsed: number) {
    this.stop();
    const show = this.show!;
    this.rejoining = true;
    this.frozen = 0;
    this.origin = this.context.currentTime - elapsed;
    this.countoffAnchor = Math.ceil(show.tempo.count(elapsed)) + 1;
    this.countoffAt = this.origin + show.tempo.seconds(this.countoffAnchor);
    const arrival = this.countoffAnchor + 8;
    this.resumeUntil = this.origin + show.tempo.seconds(arrival);
    const offset = show.tempo.seconds(arrival);
    const buffer = this.buffers.get(show.id)!;
    if (offset < buffer.duration) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gain);
      source.start(this.resumeUntil, offset);
      this.source = source;
    }
    for (const count of [0, 2, 4, 5, 6, 7])
      this.click(
        this.origin + show.tempo.seconds(this.countoffAnchor + count),
        count === 0 || count === 4,
      );
  }
  stop() {
    for (const click of this.clicks) click.stop();
    this.clicks = [];
    this.source?.stop();
    this.source = undefined;
    this.paused = false;
  }
}
