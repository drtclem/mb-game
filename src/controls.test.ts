import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { Controls } from "./controls";
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
