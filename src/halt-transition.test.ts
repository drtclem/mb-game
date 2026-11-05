import { expect, it } from "vitest";
import * as THREE from "three";
import { FOOT_SIDES } from "./combined-skin";
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
      feet: FOOT_SIDES.map((side) => new THREE.Vector3(side * 0.2, 0.17, 0)),
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

it("puts LeftHip on the character's anatomical left when facing downfield", () => {
  const model = marcher();
  const facing = new THREE.Vector3(0, 0, -1);
  const right = facing.clone().cross(new THREE.Vector3(0, 1, 0));
  expect(
    model.group.getObjectByName("LeftHip")!.position.dot(right),
  ).toBeLessThan(0);
  expect(
    model.group.getObjectByName("RightHip")!.position.dot(right),
  ).toBeGreaterThan(0);
  model.animate(1, false, false, 0, -1);
  model.group.updateMatrixWorld(true);
  const leftFoot = model.group
    .getObjectByName("LeftAnkle")!
    .getWorldPosition(new THREE.Vector3());
  const rightFoot = model.group
    .getObjectByName("RightAnkle")!
    .getWorldPosition(new THREE.Vector3());
  expect(leftFoot.dot(facing)).toBeGreaterThan(rightFoot.dot(facing));
  model.animate(2, false, false, 0, -1);
  model.group.updateMatrixWorld(true);
  expect(
    model.group
      .getObjectByName("RightAnkle")!
      .getWorldPosition(new THREE.Vector3())
      .dot(facing),
  ).toBeGreaterThan(
    model.group
      .getObjectByName("LeftAnkle")!
      .getWorldPosition(new THREE.Vector3())
      .dot(facing),
  );
});

it("matches player and AI anatomical feet on every odd/even count, forward and backward", async () => {
  const { PerformanceRun } = await import("./performance");
  const { shows } = await import("./repertoire");
  const { stepAnimation } = await import("./step-animation");
  for (const backward of [false, true]) {
    const run = new PerformanceRun(shows[0], "Easy", 5, 1);
    const player = marcher(),
      ai = marcher();
    const direction = new THREE.Vector3(0, 0, backward ? 1 : -1);
    for (let count = 8; count < 24; count++) {
      const seconds = shows[0].tempo.seconds(count);
      run.tap(seconds, {
        forward: backward ? -1 : 1,
        side: 0,
        aim: { x: 0, y: direction.z },
      });
      const pose = stepAnimation(run.steps.at(-1)!, seconds);
      player.animate(pose.count, pose.hold, pose.backward, pose.dx, pose.dz);
      ai.animate(contactGaitCount(count), false, backward, 0, direction.z);
      for (const actor of [player, ai]) {
        actor.group.updateMatrixWorld(true);
        const left = actor.group
          .getObjectByName("LeftAnkle")!
          .getWorldPosition(new THREE.Vector3());
        const right = actor.group
          .getObjectByName("RightAnkle")!
          .getWorldPosition(new THREE.Vector3());
        expect(left.x).toBeLessThan(right.x);
        const lead = (count % 2 === 0 ? left : right).dot(direction);
        const trail = (count % 2 === 0 ? right : left).dot(direction);
        expect(lead).toBeGreaterThan(trail);
      }
    }
  }
});

it("rebuilds world-space heel and forefoot anchors without sliding on the actual rig", async () => {
  const { rehearsalPose } = await import("./lower-body");
  const actor = marcher();
  for (const c of [0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]) {
    const pose = rehearsalPose(c);
    actor.poseLowerBody(pose);
    actor.group.updateMatrixWorld(true);
    const ankle = actor.group.getObjectByName("LeftAnkle")!;
    const pivot = pose.feet[0].roll >= 0 ? 0.08 : -0.2;
    const contact = ankle.localToWorld(new THREE.Vector3(0, -0.17, pivot));
    expect(contact.z).toBeCloseTo(-1 + pivot, 4);
    expect(contact.y).toBeCloseTo(0, 4);
    expect(contact.x).toBeCloseTo(-0.12, 4);
  }
  actor.poseLowerBody(rehearsalPose(3.8));
  actor.poseLowerBody(rehearsalPose(0.3));
  const first = actor.group
    .getObjectByName("LeftAnkle")!
    .getWorldPosition(new THREE.Vector3());
  actor.poseLowerBody(rehearsalPose(-1));
  actor.poseLowerBody(rehearsalPose(0.3));
  expect(
    actor.group
      .getObjectByName("LeftAnkle")!
      .getWorldPosition(new THREE.Vector3())
      .distanceTo(first),
  ).toBeLessThan(1e-7);
});
