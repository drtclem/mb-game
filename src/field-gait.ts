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
  private rightFrom?: GroundFoot;
  private rightTarget?: GroundFoot;
  private preciseHalt = false;
  reset() {
    this.beat = -Infinity;
    this.feet = undefined;
    this.body = undefined;
    this.start = undefined;
    this.end = undefined;
    this.target = undefined;
    this.from = undefined;
    this.wasHolding = true;
    this.rightFrom = undefined;
    this.rightTarget = undefined;
    this.preciseHalt = false;
  }
  /** The and before one prepares one contact, not two beats of travel. */
  prepare(
    progress: number,
    origin: Point,
    contact: Point,
    facing = 0,
  ): LowerBodyPose {
    const u = ease(Math.max(0, Math.min(1, progress)));
    const dx = contact.x - origin.x,
      dz = contact.z - origin.z;
    const body = { x: origin.x + dx * u * 0.5, z: origin.z + dz * u * 0.5 };
    const foot = (side: number): GroundFoot => ({
      x:
        origin.x +
        (side ? 0.12 : -0.12) * Math.cos(facing) +
        (side ? 0 : dx * u),
      z:
        origin.z -
        (side ? 0.12 : -0.12) * Math.sin(facing) +
        (side ? 0 : dz * u),
      yaw: 0,
      lift: side ? 0 : Math.sin(Math.PI * progress) ** 2 * 0.02,
      roll: side ? -0.22 * u : 0.25 * u,
      planted: side === 1,
    });
    this.feet = [foot(0), foot(1)];
    this.body = body;
    this.start = body;
    this.end = body;
    this.from = undefined;
    this.target = undefined;
    this.beat = -Infinity;
    this.wasHolding = true;
    return {
      body,
      feet: this.feet.map((f) => ({ ...f })) as [GroundFoot, GroundFoot],
      phase: "prepare",
      label: "",
    };
  }
  sample(
    count: number,
    desired: Point,
    next: Point,
    holding: boolean,
    backward: boolean,
    facing = 0,
    arrival?: { lastBeat: number; continues: boolean },
  ): LowerBodyPose {
    const beat = Math.floor(count),
      t = Math.max(0, Math.min(1, count - beat));
    const makeFoot = (side: number, center: Point): GroundFoot => ({
      x: center.x + (side ? 0.12 : -0.12) * Math.cos(facing),
      z: center.z - (side ? 0.12 : -0.12) * Math.sin(facing),
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
      const remaining = Math.max(0.001, 1 - t);
      const stride = {
        x: (next.x - desired.x) / remaining,
        z: (next.z - desired.z) / remaining,
      };
      const strideLength = Math.hypot(stride.x, stride.z);
      if (strideLength > 2) {
        stride.x *= 2 / strideLength;
        stride.z *= 2 / strideLength;
      }
      // Feet contact on the beat; the torso is half a stride between contacts.
      this.end = holding
        ? { ...this.start }
        : arrival
          ? { x: next.x - stride.x * 0.5, z: next.z - stride.z * 0.5 }
          : { ...next };
      if (!holding && arrival && this.wasHolding && !this.body)
        this.start = {
          x: desired.x - stride.x * 0.5,
          z: desired.z - stride.z * 0.5,
        };
      if (!holding && arrival?.continues && beat === arrival.lastBeat - 1)
        this.end = { ...next };
      const length = Math.hypot(
        this.end.x - this.start.x,
        this.end.z - this.start.z,
      );
      if (length > 2) {
        this.end.x = this.start.x + ((this.end.x - this.start.x) * 2) / length;
        this.end.z = this.start.z + ((this.end.z - this.start.z) * 2) / length;
      }
      const side = (((beat + 1) % 2) + 2) % 2;
      this.from = { ...this.feet[side] };
      const vx = this.end.x - this.start.x,
        vz = this.end.z - this.start.z;
      this.target = makeFoot(side, {
        x: this.end.x + vx * 0.5,
        z: this.end.z + vz * 0.5,
      });
      if (
        !holding &&
        arrival &&
        beat === arrival.lastBeat - 1 &&
        !arrival.continues
      ) {
        // Prepare the final RIGHT contact a count ahead; it lands on eight.
        this.target = {
          ...makeFoot(side, this.end),
          x: next.x,
          z: next.z,
        };
      }
      if (!holding && arrival && beat === arrival.lastBeat) {
        if (!arrival.continues) {
          this.preciseHalt = true;
          // Keep the right contact anchored; only the left closes into hold one.
          const right = this.feet[1];
          const halt = rehearsalPose(8).feet;
          this.target = {
            ...halt[0],
            x: right.x + halt[0].x - halt[1].x,
            z: right.z + halt[0].z - halt[1].z,
          };
        }
      }
      if (!holding && this.wasHolding) {
        this.preciseHalt = false;
        // Step-off contact is ahead of the body, never a full stride behind it.
        const support = 1 - side;
        this.feet[support] = makeFoot(support, {
          x: this.start.x + vx * 0.5,
          z: this.start.z + vz * 0.5,
        });
      }
      if (holding) {
        // Close around the planted right shoe, without translating the body.
        this.rightFrom = { ...this.feet[1] };
        this.rightTarget = this.preciseHalt
          ? { ...this.feet[1] }
          : makeFoot(1, this.start);
        const right = this.rightTarget;
        const halt = rehearsalPose(8).feet;
        this.target = {
          ...halt[0],
          x:
            right.x +
            (halt[0].x - halt[1].x) * Math.cos(facing) +
            (halt[0].z - halt[1].z) * Math.sin(facing),
          z:
            right.z -
            (halt[0].x - halt[1].x) * Math.sin(facing) +
            (halt[0].z - halt[1].z) * Math.cos(facing),
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
    if (holding && this.rightFrom && this.rightTarget) {
      this.feet[1].x = mix(this.rightFrom.x, this.rightTarget.x, u);
      this.feet[1].z = mix(this.rightFrom.z, this.rightTarget.z, u);
    }
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
