import type { Step } from "./performance";
type VisibleStep = Pick<
  Step,
  "seconds" | "end" | "number" | "from" | "to" | "backward" | "synthetic"
> & { hold?: boolean; stepOff?: boolean };
/** Finish the stride and plant at that pose; stopped feet must not snap to attention. */
export function stepAnimation(
  step: VisibleStep,
  seconds: number,
  holding = false,
) {
  const phase = Math.max(
    0,
    Math.min(
      1,
      (seconds - step.seconds) / Math.max(0.001, step.end - step.seconds),
    ),
  );
  const dx = step.to.x - step.from.x,
    dz = step.to.y - step.from.y;
  const markTime = Math.hypot(dx, dz) < 0.001;
  return {
    count: step.stepOff ? 1 : step.number + phase,
    hold: !!step.synthetic || (holding && (!step.hold || phase >= 1)),
    backward: step.backward,
    dx: markTime ? 0 : dx,
    dz: markTime ? -0.05 : dz,
  };
}
