import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { Controls, ArrowChords } from "./controls";
const listeners = new Map<string, EventListener>();
const key = (type: string, value: string) =>
  listeners.get(type)!({
    key: value,
    target: { matches: () => false },
    preventDefault: () => {},
  } as unknown as Event);
beforeEach(() => {
  listeners.clear();
  vi.stubGlobal("window", {
    isSecureContext: true,
    DeviceOrientationEvent: {},
    addEventListener: (type: string, listener: EventListener) =>
      listeners.set(type, listener),
  });
  vi.stubGlobal("screen", { orientation: { angle: 90 } });
  vi.stubGlobal("DeviceOrientationEvent", {
    requestPermission: async () => "granted",
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("travel input", () => {
  it("keeps keyboard travel available after enabling tilt without sensor data", async () => {
    const c = new Controls();
    await c.enable();
    key("keydown", "ArrowUp");
    expect(c.value).toEqual({ forward: 1, side: 0 });
  });
  it("lets deliberate keyboard arrows override a conflicting tilt reading", async () => {
    const c = new Controls();
    await c.enable();
    listeners.get("deviceorientation")!({
      beta: 0,
      gamma: 0,
    } as unknown as Event);
    listeners.get("deviceorientation")!({
      beta: 0,
      gamma: -30,
    } as unknown as Event);
    expect(c.value.forward).toBe(-1);
    key("keydown", "ArrowUp");
    expect(c.value.forward).toBe(1);
    key("keyup", "ArrowUp");
    expect(c.value.forward).toBe(-1);
  });
  it("returns to neutral after releasing travel keys or losing focus", () => {
    const c = new Controls();
    key("keydown", "ArrowUp");
    key("keydown", "ArrowRight");
    expect(c.value).toEqual({ forward: 1, side: 1 });
    key("keyup", "ArrowUp");
    expect(c.value.forward).toBe(0);
    listeners.get("blur")!(new Event("blur"));
    expect(c.value).toEqual({ forward: 0, side: 0 });
  });
});

describe("arrows carry rhythm and direction together", () => {
  it("maps single arrow presses without a Space or held-key combination", async () => {
    const { arrowStep } = await import("./controls");
    expect(arrowStep({ key: "ArrowUp" }, false)).toEqual({
      forward: 1,
      side: 0,
    });
    expect(arrowStep({ key: "ArrowDown" }, false)).toEqual({
      forward: -1,
      side: 0,
    });
    expect(arrowStep({ key: "ArrowLeft" }, false)).toEqual({
      forward: 1,
      side: -1,
    });
    expect(arrowStep({ key: "ArrowRight" }, true)).toEqual({
      forward: -1,
      side: 1,
    });
    expect(arrowStep({ key: " " }, false)).toBeNull();
    expect(arrowStep({ key: "ArrowUp", repeat: true }, false)).toBeNull();
  });
});

describe("two-key rhythm chords", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it("combines either key order into one diagonal using the first timestamp", () => {
    for (const keys of [
      ["ArrowUp", "ArrowLeft"],
      ["ArrowLeft", "ArrowUp"],
    ]) {
      const emit = vi.fn(),
        chords = new ArrowChords(emit);
      chords.press({ key: keys[0] }, 10, false);
      vi.advanceTimersByTime(25);
      chords.press({ key: keys[1] }, 10.025, false);
      vi.advanceTimersByTime(20);
      expect(emit).toHaveBeenCalledExactlyOnceWith(
        { forward: 1, side: -1 },
        10,
      );
    }
  });
  it("supports backward diagonals and opposite-arrow mark time", () => {
    const emit = vi.fn(),
      chords = new ArrowChords(emit);
    chords.press({ key: "ArrowDown" }, 10, false);
    chords.press({ key: "ArrowRight" }, 10, false);
    vi.advanceTimersByTime(45);
    expect(emit).toHaveBeenLastCalledWith({ forward: -1, side: 1 }, 10);
    chords.press({ key: "ArrowUp" }, 11, false);
    chords.press({ key: "ArrowDown" }, 11, false);
    vi.advanceTimersByTime(45);
    expect(emit).toHaveBeenLastCalledWith({ forward: 0, side: 0 }, 11);
  });
  it("keeps separate taps separate, ignores auto-repeat and cancels pending input", () => {
    const emit = vi.fn(),
      chords = new ArrowChords(emit);
    chords.press({ key: "ArrowUp" }, 10, false);
    chords.press({ key: "ArrowUp", repeat: true }, 10.01, false);
    vi.advanceTimersByTime(46);
    chords.press({ key: "ArrowLeft" }, 10.1, false);
    vi.advanceTimersByTime(45);
    expect(emit).toHaveBeenCalledTimes(2);
    chords.press({ key: "ArrowUp" }, 11, false);
    chords.cancel();
    vi.advanceTimersByTime(45);
    expect(emit).toHaveBeenCalledTimes(2);
  });
});
