import { expect, it } from "vitest";
import * as THREE from "three";
import { rigCombinedSurface } from "./combined-marcher";
import { legWeights } from "./combined-skin";

function actor(height = 1) {
  const geometry = new THREE.BufferGeometry();
  const points = [0, 2.9, -0.6, 0.3, 0.17, 0];
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
      feet: [new THREE.Vector3(0.3, 0.17, 0), new THREE.Vector3(-0.3, 0.17, 0)],
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
