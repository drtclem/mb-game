import { beforeEach, describe, it, expect, vi } from "vitest";
import { Playback } from "./playback";
import { shows } from "./repertoire";
class FakeContext {
  currentTime = 100;
  destination = {};
  sources: { when: number; offset: number }[] = [];
  resume() {
    return Promise.resolve();
  }
  decodeAudioData() {
    return Promise.resolve({ duration: 200 });
  }
  createGain() {
    return {
      connect: () => {},
      gain: {
        value: 1,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
    };
  }
  createOscillator() {
    return {
      frequency: { value: 0 },
      connect: () => ({ connect: () => {} }),
      start: () => {},
      stop: () => {},
      onended: null,
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: (when: number, offset: number) =>
        this.sources.push({ when, offset }),
      stop: () => {},
    };
  }
}
describe("audio clock scheduling", () => {
  beforeEach(() => {
    vi.stubGlobal("AudioContext", FakeContext);
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
  });
  it("rejoins at the ongoing show time instead of falling behind by a count-in", async () => {
    const p = new Playback();
    await p.prepare(shows[0]);
    p.show = shows[0];
    const elapsed = 38;
    p.rejoin(elapsed);
    expect(p.seconds).toBeCloseTo(elapsed);
    (p.context as unknown as FakeContext).currentTime += 2;
    expect(p.seconds).toBeCloseTo(elapsed + 2);
    const source = (p.context as unknown as FakeContext).sources.at(-1)!;
    expect(source.when - p.origin).toBeCloseTo(source.offset);
    (p.context as unknown as FakeContext).currentTime = source.when;
    expect(p.seconds).toBeCloseTo(source.offset);
    expect(p.countingIn).toBe(false);
  });
  it("solo resume holds show time through the lead-in, then continues at that offset", async () => {
    const p = new Playback();
    await p.prepare(shows[0]);
    p.start(shows[0]);
    (p.context as unknown as FakeContext).currentTime = p.origin + 12;
    p.pause();
    (p.context as unknown as FakeContext).currentTime += 20;
    p.resume();
    expect(p.countoffCounts).toBe(4);
    const anchor = shows[0].tempo.count(12);
    expect(p.resumeUntil - p.countoffAt).toBeCloseTo(
      shows[0].tempo.seconds(anchor + 4) - 12,
    );
    expect(p.seconds).toBeCloseTo(12);
    (p.context as unknown as FakeContext).currentTime = p.resumeUntil;
    expect(p.seconds).toBeCloseTo(12);
  });
});
