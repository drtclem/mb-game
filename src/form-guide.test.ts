import { expect, it } from "vitest";
import { curveSide } from "./form-guide";
it("distinguishes inside and outside a translated curve", () => {
  const l = { x: -1, y: 0 },
    c = { x: 0, y: 1 },
    r = { x: 1, y: 0 },
    ref = { x: 3, y: 5 };
  expect(curveSide(l, c, r, ref, ref)).toBe("ON THE CURVE");
  expect(curveSide(l, c, r, ref, { x: 3, y: 4.5 })).toBe("INSIDE CURVE");
  expect(curveSide(l, c, r, ref, { x: 3, y: 5.5 })).toBe("OUTSIDE CURVE");
  expect(curveSide(l, { x: 0, y: 0 }, r, ref, ref)).toBe("ADJUST TO THE LINE");
});
