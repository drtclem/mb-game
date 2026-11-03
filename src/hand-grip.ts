import * as THREE from "three";

/** Curl the distal part of an open glove; leave its wrist and palm unchanged. */
export function curlFinger(
  point: THREE.Vector3,
  forward: THREE.Vector3,
  flex: THREE.Vector3,
  knuckle: number,
) {
  const distance = point.dot(forward) - knuckle;
  if (distance <= 0) return point.clone();
  const radius = knuckle * 0.48;
  const angle = Math.min(distance / radius, 2.65);
  const along = radius * Math.sin(angle);
  const inward = radius * (1 - Math.cos(angle));
  return point
    .clone()
    .addScaledVector(forward, along - distance)
    .addScaledVector(flex, inward);
}

/** Meshy's wrist helpers are not finger joints. Consolidate them and add a grip shape. */
export function prepareHandGrip(mesh: THREE.SkinnedMesh) {
  const hands = mesh.skeleton.bones
    .map((joint, index) => ({ joint, index }))
    .filter(({ joint }) => /Hand$/.test(joint.name));
  const remap = new Map<number, number>();
  for (const [index, joint] of mesh.skeleton.bones.entries()) {
    if (!/^Bone_/.test(joint.name)) continue;
    const at = joint.getWorldPosition(new THREE.Vector3());
    const nearest = hands.reduce((a, b) =>
      a.joint.getWorldPosition(new THREE.Vector3()).distanceToSquared(at) <
      b.joint.getWorldPosition(new THREE.Vector3()).distanceToSquared(at)
        ? a
        : b,
    );
    if (
      nearest.joint.getWorldPosition(new THREE.Vector3()).distanceTo(at) < 0.4
    )
      remap.set(index, nearest.index);
  }
  const geometry = mesh.geometry.clone();
  const indices = geometry.getAttribute("skinIndex");
  const weights = geometry.getAttribute("skinWeight");
  for (let vertex = 0; vertex < indices.count; vertex++)
    for (let component = 0; component < 4; component++) {
      const replacement = remap.get(indices.getComponent(vertex, component));
      if (replacement !== undefined)
        indices.setComponent(vertex, component, replacement);
    }
  const positions = geometry.getAttribute("position");
  const grip = positions.clone();
  for (const { joint, index } of hands) {
    const tip = mesh.skeleton.bones.find(
      (b) => b.name === (joint.name.includes("Left") ? "Bone_024" : "Bone_019"),
    );
    if (!tip) continue;
    const toHand = joint.matrixWorld
      .clone()
      .invert()
      .multiply(mesh.matrixWorld);
    const fromHand = toHand.clone().invert();
    const forward = joint
      .worldToLocal(tip.getWorldPosition(new THREE.Vector3()))
      .normalize();
    const flex = new THREE.Vector3(0, 0, 1).transformDirection(
      joint.matrixWorld.clone().invert(),
    );
    flex.addScaledVector(forward, -flex.dot(forward)).normalize();
    const knuckle =
      joint
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(tip.getWorldPosition(new THREE.Vector3())) * 0.48;
    for (let v = 0; v < positions.count; v++) {
      let influence = 0;
      for (let c = 0; c < 4; c++)
        if (indices.getComponent(v, c) === index)
          influence += weights.getComponent(v, c);
      if (influence < 0.5) continue;
      const original = new THREE.Vector3().fromBufferAttribute(positions, v);
      const local = original.clone().applyMatrix4(toHand);
      const closed = curlFinger(local, forward, flex, knuckle).applyMatrix4(
        fromHand,
      );
      original.lerp(closed, Math.min(1, influence));
      grip.setXYZ(v, original.x, original.y, original.z);
    }
  }
  geometry.morphAttributes.position = [grip];
  geometry.morphTargetsRelative = false;
  mesh.geometry = geometry;
  mesh.updateMorphTargets();
}
