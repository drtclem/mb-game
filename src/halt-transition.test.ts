import { expect, it } from "vitest";
import * as THREE from "three";
import { rigCombinedSurface } from "./combined-marcher";
import {
  haltClosure,
  haltFootPose,
  footPose,
  contactGaitCount,
} from "./marching-motion";

function marcher() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 2, 0], 3),
  );
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute([0, 0, 0, 0], 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute([1, 0, 0, 0], 4),
  );
  return rigCombinedSurface(
    {
      body: { geometry, material: new THREE.MeshStandardMaterial() },
      feet: [new THREE.Vector3(0.2, 0.17, 0), new THREE.Vector3(-0.2, 0.17, 0)],
    },
    1,
  );
}
it("does not jump the right foot at the handoff from the last traveling count to the planted halt", () => {
  const before = footPose(contactGaitCount(23 - 0.000001), 1, false, false);
  const arrival = haltFootPose(1, 0);
  expect(before.travel).toBeCloseTo(arrival.travel, 4);
});
it("keeps the actual rig's right ankle anchored through the hold closure", () => {
  const model = marcher();
  const right = model.group.getObjectByName("RightAnkle")!;
  const samples = [];
  for (const count of [23, 23.25, 23.5, 23.75, 24, 25]) {
    const closure = haltClosure(count, count >= 24, true);
    model.group.position.set(0, 0, 0.5 * (1 - closure));
    model.animate(0, true, false, 0, -1, closure);
    model.group.updateMatrixWorld(true);
    samples.push(right.getWorldPosition(new THREE.Vector3()));
  }
  for (const point of samples) {
    expect(point.distanceTo(samples[0])).toBeLessThan(0.001);
  }
});

it("hands the actual rig from the final swing to right-foot contact without a full-stride jump", () => {
  const model = marcher(),
    right = model.group.getObjectByName("RightAnkle")!;
  model.group.position.set(0, 0, 0.500001);
  model.animate(contactGaitCount(23 - 0.000001), false, false, 0, -1);
  model.group.updateMatrixWorld(true);
  const before = right.getWorldPosition(new THREE.Vector3());
  model.group.position.set(0, 0, 0.5);
  model.animate(0, true, false, 0, -1, 0);
  model.group.updateMatrixWorld(true);
  const after = right.getWorldPosition(new THREE.Vector3());
  expect(Math.abs(before.z - after.z)).toBeLessThan(0.001);
  // Heel contact settles to a flat shoe; it must not move a stride forward.
  expect(before.distanceTo(after)).toBeLessThan(0.03);
});
