import type { Step } from "./performance";
type VisibleStep = Pick<
  Step,
  "seconds" | "end" | "number" | "from" | "to" | "backward" | "synthetic"
> & { hold?: boolean; stepOff?: boolean; foot?: 0 | 1 };
/** Finish the stride and plant at that pose; stopped feet must not snap to attention. */
export function stepAnimation(
  step: VisibleStep,
  seconds: number,
  holding = false,
  upcoming?: { contact: number; halfBeat: number },
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
  let count = step.stepOff ? 1 : step.number + phase;
  if (step.foot !== undefined && !step.hold && !step.synthetic) {
    count = step.foot + 1;
    if (upcoming && !holding && upcoming.halfBeat > 0) {
      const t =
        (seconds - (upcoming.contact - upcoming.halfBeat)) / upcoming.halfBeat;
      // Prepare the next contact, but never complete a new step without its input.
      const prepare =
        t < 1
          ? Math.max(0, Math.min(0.98, t))
          : 0.98 *
            Math.max(
              0,
              1 - (seconds - upcoming.contact) / (upcoming.halfBeat * 0.4),
            );
      count += prepare;
    }
  }
  return {
    count,
    hold: !!step.synthetic || (holding && (!step.hold || phase >= 1)),
    backward: step.backward,
    dx: markTime ? 0 : dx,
    dz: markTime ? -0.05 : dz,
  };
}
