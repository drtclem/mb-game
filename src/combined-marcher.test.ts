import { expect, it } from "vitest";
import * as THREE from "three";
import { authoredShoeYaw, rigCombinedSurface } from "./combined-marcher";
import { legWeights, FOOT_SIDES } from "./combined-skin";

function actor(height = 1) {
  const geometry = new THREE.BufferGeometry();
  const points = [0, 2.9, -0.6, -0.3, 0.17, 0];
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
  const joints: number[] = [],
    weights: number[] = [];
  for (let i = 0; i < points.length; i += 3) {
    const w = legWeights(points[i], points[i + 1], 1.5, 0.84, 0.2);
    joints.push(...w.joints);
    weights.push(...w.weights);
  }
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(joints, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  const result = rigCombinedSurface(
    {
      body: { geometry, material: new THREE.MeshStandardMaterial() },
      feet: FOOT_SIDES.map((side) => new THREE.Vector3(side * 0.3, 0.17, 0)),
    },
    height,
  );
  const mesh = result.group.children[0] as THREE.SkinnedMesh;
  const at = (i: number) =>
    mesh.applyBoneTransform(
      i,
      new THREE.Vector3().fromBufferAttribute(
        geometry.getAttribute("position"),
        i,
      ),
    );
  return { ...result, at };
}
it("moves legs without moving the hand/horn vertices and repeats independently of frame history", () => {
  const a = actor(),
    upper = a.at(0),
    foot = a.at(1);
  a.animate(1.3, false, false);
  expect(a.at(0).distanceTo(upper)).toBeLessThan(1e-7);
  expect(a.at(1).distanceTo(foot)).toBeGreaterThan(0.03);
  const repeated = a.at(1);
  a.animate(7.8, false, true);
  a.animate(1.3, false, false);
  expect(a.at(1).distanceTo(repeated)).toBeLessThan(1e-7);
});
it("plants holds at every count and keeps translated actors independent", () => {
  const a = actor(),
    b = actor();
  a.group.position.set(12, 0, -8);
  a.animate(0, true, false);
  const foot = a.at(1);
  a.animate(25.5, true, false);
  expect(a.at(1).distanceTo(foot)).toBeLessThan(1e-7);
  b.animate(1.4, false, false);
  expect(a.at(1).distanceTo(foot)).toBeLessThan(1e-7);
  expect(a.at(0).distanceTo(new THREE.Vector3(0, 2.9, -0.6))).toBeLessThan(
    1e-6,
  );
});

it("keeps a support foot planted while the actor travels a full written step per count", () => {
  for (const height of [0.96, 1, 1.05]) {
    const a = actor(height);
    a.group.position.z = -1.2;
    a.animate(1.2, false, false, 0, -1);
    const before = a.at(1).applyMatrix4(a.group.matrixWorld);
    a.group.position.z = -1.6;
    a.animate(1.6, false, false, 0, -1);
    const after = a.at(1).applyMatrix4(a.group.matrixWorld);
    expect(after.z).toBeCloseTo(before.z, 5);
    expect(after.x).toBeCloseTo(before.x, 5);
  }
});

it("keeps forward/backward leg tracks close without crossing or bowing the knees outward", () => {
  const a = actor();
  for (const backward of [false, true])
    for (const hold of [false, true])
      for (const count of [0, 0.25, 0.5, 0.75, 1, 1.5, 1.99]) {
        a.animate(count, hold, backward);
        const left = a.group
          .getObjectByName("LeftAnkle")!
          .getWorldPosition(new THREE.Vector3());
        const right = a.group
          .getObjectByName("RightAnkle")!
          .getWorldPosition(new THREE.Vector3());
        expect(right.x - left.x).toBeLessThan(0.35);
        expect(right.x - left.x).toBeGreaterThan(0.15);
        for (const side of ["Left", "Right"]) {
          const hip = a.group
            .getObjectByName(`${side}Hip`)!
            .getWorldPosition(new THREE.Vector3());
          const knee = a.group
            .getObjectByName(`${side}Knee`)!
            .getWorldPosition(new THREE.Vector3());
          expect(Math.abs(knee.x)).toBeLessThanOrEqual(Math.abs(hip.x) + 0.025);
        }
      }
});

it("keeps a completed tap visibly planted in its stride rather than erasing the leg motion", async () => {
  const { stepAnimation } = await import("./step-animation");
  const a = actor();
  a.animate(0, true, false);
  const attention = a.at(1);
  const step = {
    seconds: 0,
    end: 0.6,
    number: 0,
    from: { x: 0, y: 0 },
    to: { x: 0, y: -1 },
    backward: false,
  };
  const pose = stepAnimation(step, 0.61);
  a.animate(pose.count, pose.hold, pose.backward, pose.dx, pose.dz);
  expect(a.at(1).distanceTo(attention)).toBeGreaterThan(0.2);
  const planted = a.at(1),
    later = stepAnimation(step, 10);
  a.animate(later.count, later.hold, later.backward, later.dx, later.dz);
  expect(a.at(1).distanceTo(planted)).toBeLessThan(1e-7);
});

it("brings both feet level again at a hold after a completed stride", async () => {
  const { stepAnimation } = await import("./step-animation");
  const a = actor();
  a.animate(1, false, false, 0, -1);
  const pose = stepAnimation(
    {
      seconds: 0,
      end: 0.6,
      number: 0,
      from: { x: 0, y: 0 },
      to: { x: 0, y: -1 },
      backward: false,
    },
    0.7,
    true,
  );
  a.animate(pose.count, pose.hold, pose.backward, pose.dx, pose.dz);
  const left = a.group
    .getObjectByName("LeftAnkle")!
    .getWorldPosition(new THREE.Vector3());
  const right = a.group
    .getObjectByName("RightAnkle")!
    .getWorldPosition(new THREE.Vector3());
  expect(left.z).toBeCloseTo(right.z, 6);
  expect(left.y).toBeCloseTo(right.y, 6);
});

it("measures baked shoe turnout from the sole instead of assuming neutral bones", () => {
  for (const side of [-1, 1]) {
    const yaw = -side * 0.4;
    const points: number[] = [];
    for (const x of [-0.04, 0.04])
      for (const z of [-0.22, 0.08]) {
        points.push(
          side * 0.3 + x * Math.cos(yaw) + z * Math.sin(yaw),
          0.02,
          -x * Math.sin(yaw) + z * Math.cos(yaw),
        );
      }
    const attr = new THREE.Float32BufferAttribute(points, 3);
    expect(authoredShoeYaw(attr, side)).toBeCloseTo(yaw, 5);
  }
});

it("uses the reviewed gait without changing gameplay travel and closes into turnout", () => {
  const a = actor();
  a.group.position.set(12, 0, -9);
  for (const backward of [false, true]) {
    for (const count of [1, 1.5, 2, 2.5]) {
      a.animateReviewed(count, false, backward, 0.3, backward ? 1 : -1);
      expect(a.group.position.x).toBe(12);
      expect(a.group.position.z).toBe(-9);
      expect(a.at(1).toArray().every(Number.isFinite)).toBe(true);
    }
  }
  a.animateReviewed(0, true, false);
  const held = a.at(1);
  a.animateReviewed(0, true, false);
  expect(a.at(1).distanceTo(held)).toBeLessThan(1e-7);
});

import { rehearsalPose } from "./lower-body";
it("turns the lower-body hip axis for sliding while leaving chest and horn vertices fixed", () => {
  const a = actor(),
    upper = a.at(0);
  const frame = rehearsalPose(1.5);
  frame.lowerYaw = -Math.PI / 2;
  frame.feet.forEach((f) => (f.yaw = -Math.PI / 2));
  a.poseLowerBody(frame);
  expect(a.at(0).distanceTo(upper)).toBeLessThan(1e-7);
  const left = a.group.getObjectByName("LeftHip")!,
    right = a.group.getObjectByName("RightHip")!;
  expect(left.position.x).toBeCloseTo(0);
  expect(right.position.x).toBeCloseTo(0);
  expect(right.position.z).toBeGreaterThan(left.position.z);
  expect(a.group.rotation.y).toBe(0);
});

import { FieldGait } from "./field-gait";
it("keeps sliding recovery feet at their requested height through sharp direction changes", () => {
  const a = actor(),
    gait = new FieldGait();
  let center = { x: 0, z: 0 };
  for (let beat = 0; beat < 16; beat++) {
    const angle = beat % 2 ? Math.PI / 2 : -Math.PI / 2;
    const next = { x: center.x + Math.sin(angle) * 2, z: center.z - 0.2 };
    for (const phase of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      const frame = gait.sample(beat + phase, center, next, false, false, 0, {
        lastBeat: 100,
        continues: true,
      });
      a.poseLowerBody(frame);
      const actual = a.group.localToWorld(a.at(1));
      expect(
        actual.distanceTo(
          new THREE.Vector3(
            frame.feet[0].x,
            0.17 + frame.feet[0].lift,
            frame.feet[0].z,
          ),
        ),
      ).toBeLessThan(0.12);
    }
    center = { x: a.group.position.x, z: a.group.position.z };
  }
});

it("finishes an off-dot correction upright over the planted right shoe at hold one", () => {
  const a = actor(),
    gait = new FieldGait();
  let center = { x: 0, z: 0 };
  for (let beat = 0; beat < 8; beat++)
    for (const t of [0, 0.25, 0.5, 0.75, 0.999]) {
      const next = { x: beat > 3 ? 25 : 0, z: beat > 3 ? 20 : -beat - 1 };
      const pose = gait.sample(beat + t, center, next, false, false, 0, {
        lastBeat: 7,
        continues: false,
      });
      a.poseLowerBody(pose);
      if (t === 0.999) center = pose.body;
    }
  const halt = gait.sample(8, center, center, true, false);
  a.poseLowerBody(halt);
  expect(
    Math.hypot(halt.body.x - halt.feet[1].x, halt.body.z - halt.feet[1].z),
  ).toBeLessThan(0.1);
  expect(a.group.position.y).toBeGreaterThan(-0.08);
});
