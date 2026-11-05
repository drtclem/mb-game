import type { LowerBodyPose, GroundFoot } from "./lower-body";
import { rehearsalPose } from "./lower-body";
type Point = { x: number; z: number };
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Persistent field anchors: steering never moves a shoe already on the ground. */
export class FieldGait {
  private beat = -Infinity;
  private feet?: [GroundFoot, GroundFoot];
  private from?: GroundFoot;
  private target?: GroundFoot;
  private body?: Point;
  private start?: Point;
  private end?: Point;
  private wasHolding = true;
  reset() {
    this.beat = -Infinity;
    this.feet = undefined;
    this.body = undefined;
    this.start = undefined;
    this.end = undefined;
    this.target = undefined;
    this.from = undefined;
    this.wasHolding = true;
  }
  sample(
    count: number,
    desired: Point,
    next: Point,
    holding: boolean,
    backward: boolean,
  ): LowerBodyPose {
    const beat = Math.floor(count),
      t = Math.max(0, Math.min(1, count - beat));
    const makeFoot = (side: number, center: Point): GroundFoot => ({
      x: center.x + (side ? 0.12 : -0.12),
      z: center.z,
      yaw: 0,
      lift: 0,
      roll: 0,
      planted: true,
    });
    if (!this.feet) this.feet = [makeFoot(0, desired), makeFoot(1, desired)];
    if (beat !== this.beat || holding !== this.wasHolding) {
      if (this.target)
        this.feet[this.wasHolding ? 0 : (((this.beat + 1) % 2) + 2) % 2] = {
          ...this.target,
          lift: 0,
          planted: true,
        };
      this.start = this.end ?? this.body ?? { ...desired };
      this.end = holding ? { ...this.start } : { ...next };
      const side = (((beat + 1) % 2) + 2) % 2;
      this.from = { ...this.feet[side] };
      this.target = makeFoot(side, this.end);
      if (holding) {
        // Close around the planted right shoe, without translating the body.
        const right = this.feet[1];
        const halt = rehearsalPose(8).feet;
        this.target = {
          ...halt[0],
          x: right.x + halt[0].x - halt[1].x,
          z: right.z + halt[0].z - halt[1].z,
        };
        this.from = { ...this.feet[0] };
      }
      this.beat = beat;
      this.wasHolding = holding;
    }
    const body = {
      x: mix(this.start!.x, this.end!.x, t),
      z: mix(this.start!.z, this.end!.z, t),
    };
    this.body = body;
    const side = holding ? 0 : (((beat + 1) % 2) + 2) % 2;
    const u = ease(t);
    const swing = this.feet[side];
    swing.x = mix(this.from!.x, this.target!.x, u);
    swing.z = mix(this.from!.z, this.target!.z, u);
    swing.lift = holding ? 0 : Math.sin(Math.PI * t) ** 2 * 0.02;
    swing.planted = t === 0;
    this.feet.forEach((foot, i) => {
      foot.yaw = holding ? ((i ? -1 : 1) * Math.PI) / 4 : 0;
      foot.roll = holding
        ? 0
        : backward
          ? -0.34
          : i === side
            ? mix(-0.22, 0.25, u)
            : mix(0.25, -0.22, u);
      if (i !== side) {
        foot.lift = 0;
        foot.planted = true;
      }
    });
    return {
      body,
      feet: this.feet.map((f) => ({ ...f })) as [GroundFoot, GroundFoot],
      phase: holding ? "hold" : "march",
      label: "",
    };
  }
}
