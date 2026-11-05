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
  private prepOrigin?: Point;
  private slideYaw = 0;
  private slideFrom = 0;
  private slideTarget = 0;
  private pivotBeat = -1;
  private pivotFeet?: [GroundFoot, GroundFoot];
  private pivotFrom?: GroundFoot;
  private pivotTarget?: GroundFoot;
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
    this.prepOrigin = undefined;
    this.slideYaw = 0;
    this.slideFrom = 0;
    this.slideTarget = 0;
    this.pivotFeet = undefined;
    this.pivotBeat = -1;
    this.pivotTarget = undefined;
  }
  /** The and before one prepares one contact, not two beats of travel. */
  prepare(
    progress: number,
    origin: Point,
    contact: Point,
    facing = 0,
  ): LowerBodyPose {
    this.prepOrigin ??= { ...(this.body ?? origin) };
    const requestedOrigin = origin;
    origin = this.prepOrigin;
    const raw = {
      x: contact.x - requestedOrigin.x,
      z: contact.z - requestedOrigin.z,
    };
    const length = Math.hypot(raw.x, raw.z),
      scale = length > 2 ? 2 / length : 1;
    contact = { x: origin.x + raw.x * scale, z: origin.z + raw.z * scale };
    const u = ease(Math.max(0, Math.min(1, progress)));
    const dx = contact.x - origin.x,
      dz = contact.z - origin.z;
    const track = Math.atan2(-dx, Math.abs(dz));
    this.slideYaw = track;
    this.slideFrom = track;
    this.slideTarget = track;
    const body = { x: origin.x + dx * u * 0.5, z: origin.z + dz * u * 0.5 };
    const foot = (side: number): GroundFoot => ({
      x:
        origin.x +
        (side ? 0.12 : -0.12) * Math.cos(track) +
        (side ? 0 : dx * u),
      z:
        origin.z -
        (side ? 0.12 : -0.12) * Math.sin(track) +
        (side ? 0 : dz * u),
      yaw: track - facing,
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
      lowerYaw: track - facing,
      phase: "prepare",
      label: "",
    };
  }
  /** Four quarter-turns. The support shoe retains its world position AND yaw. */
  pivot(local: number, origin: Point, direction: number) {
    const beat = Math.min(3, Math.max(0, Math.floor(local)));
    const t = Math.max(0, Math.min(1, (local - beat) * 2)),
      u = ease(t);
    const facing = ((direction * Math.PI) / 2) * (beat + u);
    const body = this.body ?? origin;
    if (!this.pivotFeet)
      this.pivotFeet = [0, 1].map((side) => ({
        x: body.x + (side ? 0.12 : -0.12),
        z: body.z,
        lift: 0,
        roll: 0,
        yaw: 0,
        planted: true,
      })) as [GroundFoot, GroundFoot];
    if (beat !== this.pivotBeat) {
      if (this.pivotTarget && this.pivotBeat >= 0)
        this.pivotFeet[this.pivotBeat % 2] = { ...this.pivotTarget };
      const side = beat % 2,
        angle = ((direction * Math.PI) / 2) * (beat + 1),
        offset = side ? 0.12 : -0.12;
      this.pivotFrom = { ...this.pivotFeet[side] };
      this.pivotTarget = {
        x: body.x + offset * Math.cos(angle),
        z: body.z - offset * Math.sin(angle),
        yaw: angle,
        roll: 0,
        lift: 0,
        planted: true,
      };
      this.pivotBeat = beat;
    }
    const side = beat % 2,
      from = this.pivotFrom!,
      target = this.pivotTarget!;
    this.pivotFeet[side] = {
      ...target,
      x: mix(from.x, target.x, u),
      z: mix(from.z, target.z, u),
      yaw: mix(from.yaw, target.yaw, u),
      lift: Math.sin(Math.PI * t) ** 2 * 0.045,
      planted: t === 1,
    };
    const feet = this.pivotFeet.map((f) => ({ ...f, yaw: f.yaw - facing })) as [
      GroundFoot,
      GroundFoot,
    ];
    this.feet = feet;
    this.body = body;
    this.start = body;
    this.end = body;
    this.target = undefined;
    this.beat = -Infinity;
    this.wasHolding = true;
    return {
      facing,
      pose: { body, feet, phase: "hold", label: "PIVOT" } as LowerBodyPose,
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
    this.prepOrigin = undefined;
    this.pivotFeet = undefined;
    this.pivotBeat = -1;
    this.pivotTarget = undefined;
    const beat = Math.floor(count),
      t = Math.max(0, Math.min(1, count - beat));
    if (!holding && beat !== this.beat) {
      const dx = next.x - desired.x,
        dz = next.z - desired.z;
      if (Math.hypot(dx, dz) > 0.001) {
        this.slideFrom = this.slideYaw;
        const target = Math.atan2(-dx, Math.abs(dz));
        this.slideTarget =
          this.slideFrom +
          Math.atan2(
            Math.sin(target - this.slideFrom),
            Math.cos(target - this.slideFrom),
          );
      }
    }
    const track = holding ? facing : this.slideTarget;
    const makeFoot = (side: number, center: Point): GroundFoot => ({
      x: center.x + (side ? 0.12 : -0.12) * Math.cos(track),
      z: center.z - (side ? 0.12 : -0.12) * Math.sin(track),
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
      const turnAngle = Math.abs(this.slideTarget - this.slideFrom);
      const bodyLimit = 2 / (1 + turnAngle);
      if (length > bodyLimit) {
        this.end.x =
          this.start.x + ((this.end.x - this.start.x) * bodyLimit) / length;
        this.end.z =
          this.start.z + ((this.end.z - this.start.z) * bodyLimit) / length;
      }
      const side = (((beat + 1) % 2) + 2) % 2;
      if (arrival && !holding && !this.wasHolding) {
        const support = this.feet[1 - side];
        const dx = this.end.x - support.x,
          dz = this.end.z - support.z;
        const reach = Math.hypot(dx, dz);
        if (reach > 1.05) {
          this.end.x = support.x + (dx * 1.05) / reach;
          this.end.z = support.z + (dz * 1.05) / reach;
        }
      }
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
      if (!holding) {
        const support = this.feet[1 - side];
        const dx = this.target.x - support.x,
          dz = this.target.z - support.z;
        const span = Math.hypot(dx, dz);
        const spanLimit = 2 / (1 + turnAngle * 0.5);
        if (span > spanLimit) {
          this.target.x = support.x + (dx * spanLimit) / span;
          this.target.z = support.z + (dz * spanLimit) / span;
        }
      }
      this.beat = beat;
      this.wasHolding = holding;
    }
    const body = {
      x: mix(this.start!.x, this.end!.x, t),
      z: mix(this.start!.z, this.end!.z, t),
    };
    this.slideYaw = mix(this.slideFrom, this.slideTarget, ease(t));
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
      foot.yaw = holding
        ? ((i ? -1 : 1) * Math.PI) / 4
        : this.slideTarget - facing;
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
    if (holding && Math.abs(Math.sin(facing / 2)) > 0.001) {
      this.feet.forEach((f) => {
        f.lift = 0;
        f.planted = true;
      });
      const turnSide = ((beat % 2) + 2) % 2;
      this.feet[turnSide].lift = Math.sin(Math.PI * t) ** 2 * 0.045;
      this.feet[turnSide].planted = t === 0;
    }
    return {
      body,
      feet: this.feet.map((f) => ({ ...f })) as [GroundFoot, GroundFoot],
      lowerYaw: holding ? 0 : this.slideYaw - facing,
      phase: holding ? "hold" : "march",
      label: "",
    };
  }
}
