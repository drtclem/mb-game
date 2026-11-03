import { Vector3 } from "three";

/** Solve in the caller's coordinate space; the end is clamped to a reachable target. */
export function twoBoneTargets(
  origin: Vector3,
  requested: Vector3,
  upper: number,
  lower: number,
  pole: Vector3,
) {
  const direction = requested.clone().sub(origin);
  if (direction.lengthSq() < 1e-12) direction.set(0, -1, 0);
  const distance = Math.max(
    Math.abs(upper - lower) + 1e-5,
    Math.min(requested.distanceTo(origin), upper + lower - 1e-5),
  );
  direction.normalize();
  const along =
    (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const bend = pole.clone().addScaledVector(direction, -pole.dot(direction));
  if (bend.lengthSq() < 1e-10) {
    bend.set(
      Math.abs(direction.x) < 0.8 ? 1 : 0,
      Math.abs(direction.x) < 0.8 ? 0 : 1,
      0,
    );
    bend.addScaledVector(direction, -bend.dot(direction));
  }
  bend.normalize();
  return {
    knee: origin
      .clone()
      .addScaledVector(direction, along)
      .addScaledVector(bend, height),
    end: origin.clone().addScaledVector(direction, distance),
  };
}
