import type { Dot } from "./drill";
/** Signed radial error against the written local circle, translated to the fitted form. */
export function curveSide(
  left: Dot,
  center: Dot,
  right: Dot,
  reference: Dot,
  player: Dot,
) {
  const ax = left.x - center.x,
    ay = left.y - center.y;
  const bx = right.x - center.x,
    by = right.y - center.y;
  const det = 2 * (ax * by - ay * bx);
  if (Math.abs(det) < 0.001) return "ADJUST TO THE LINE";
  const aa = ax * ax + ay * ay,
    bb = bx * bx + by * by;
  const cx = (aa * by - bb * ay) / det,
    cy = (ax * bb - bx * aa) / det;
  const error =
    Math.hypot(player.x - reference.x - cx, player.y - reference.y - cy) -
    Math.hypot(cx, cy);
  return Math.abs(error) < 0.3
    ? "ON THE CURVE"
    : error < 0
      ? "INSIDE CURVE"
      : "OUTSIDE CURVE";
}
