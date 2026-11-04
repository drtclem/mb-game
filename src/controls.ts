import type { Steering } from "./performance";
export class Controls {
  keys = new Set<string>();
  tilt: Steering = { forward: 0, side: 0 };
  enabled = false;
  error = "";
  private neutral?: { forward: number; side: number };
  private latest?: { forward: number; side: number };
  constructor() {
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        this.keys.add(e.key);
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key));
    window.addEventListener("blur", () => this.keys.clear());
    window.addEventListener("deviceorientation", (e) => {
      if (!this.enabled || e.beta === null || e.gamma === null) return;
      const angle =
        ((screen.orientation?.angle ??
          (window as unknown as { orientation?: number }).orientation ??
          90) *
          Math.PI) /
        180;
      this.latest = {
        forward: e.beta * Math.cos(angle) + e.gamma * Math.sin(angle),
        side: e.gamma * Math.cos(angle) - e.beta * Math.sin(angle),
      };
      this.neutral ??= { ...this.latest };
      const axis = (v: number) =>
        Math.abs(v) < 5
          ? 0
          : Math.sign(v) * Math.min(1, (Math.abs(v) - 5) / 15);
      this.tilt = {
        forward: axis(this.latest.forward - this.neutral.forward),
        side: axis(this.latest.side - this.neutral.side),
      };
    });
  }
  get value(): Steering {
    // A deliberate key press takes priority, including on devices with tilt enabled.
    if (this.keys.size)
      return {
        forward:
          Number(this.keys.has("ArrowUp")) - Number(this.keys.has("ArrowDown")),
        side:
          Number(this.keys.has("ArrowRight")) -
          Number(this.keys.has("ArrowLeft")),
      };
    return this.enabled ? this.tilt : { forward: 0, side: 0 };
  }
  recenter() {
    this.neutral = this.latest ? { ...this.latest } : undefined;
    this.tilt = { forward: 0, side: 0 };
  }
  get hasReading() {
    return !!this.latest;
  }
  async enable() {
    if (!("DeviceOrientationEvent" in window))
      throw Error("This device does not support tilt. Use a keyboard device.");
    if (!window.isSecureContext)
      throw Error("Tilt needs HTTPS on your phone. Open the secure game link.");
    const api = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (api.requestPermission && (await api.requestPermission()) !== "granted")
      throw Error(
        "Motion permission is required for tilt steering. Enable it and retry.",
      );
    if (!("DeviceOrientationEvent" in window))
      throw Error("This device does not support tilt. Use a keyboard device.");
    this.enabled = true;
    this.recenter();
  }
}

/** An arrow press supplies both the rhythm action and its guided direction. */
export function arrowStep(
  event: { key: string; repeat?: boolean },
  backward: boolean,
): Steering | null {
  if (event.repeat) return null;
  const travel = backward ? -1 : 1;
  switch (event.key) {
    case "ArrowUp":
      return { forward: 1, side: 0 };
    case "ArrowDown":
      return { forward: -1, side: 0 };
    case "ArrowLeft":
      return { forward: travel, side: -1 };
    case "ArrowRight":
      return { forward: travel, side: 1 };
    default:
      return null;
  }
}
