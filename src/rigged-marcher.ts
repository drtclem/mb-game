import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { footPose } from "./marching-motion";

/** Original generated mesh; motion is authored here and driven only by counts. */
export async function loadRiggedMarcher() {
  const gltf = await new GLTFLoader().loadAsync(
    "/models/white-marcher-woman.glb",
  );
  const group = new THREE.Group();
  group.add(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const scale = 3.7 / (box.max.y - box.min.y);
  gltf.scene.scale.setScalar(scale);
  gltf.scene.position.y = -box.min.y * scale;
  gltf.scene.rotation.y = Math.PI;
  const bones: THREE.Bone[] = [];
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.Bone) bones.push(o);
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      materials.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) m.envMapIntensity = 0.6;
      });
    }
  });
  const bone = (suffix: string) => {
    const result = bones.find((b) =>
      b.name.replace(/[^a-zA-Z0-9]/g, "").endsWith(suffix),
    );
    if (!result) throw Error(`Character rig missing ${suffix}`);
    return result;
  };
  const rest = bones.map((b) => ({
    bone: b,
    position: b.position.clone(),
    quaternion: b.quaternion.clone(),
  }));
  group.updateMatrixWorld(true);
  const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  const legs = ["Left", "Right"].map((s) => {
    const hip = bone(`${s}UpLeg`),
      knee = bone(`${s}Leg`),
      ankle = bone(`${s}Foot`);
    return {
      hip,
      knee,
      ankle,
      foot: world(ankle),
      l1: world(hip).distanceTo(world(knee)),
      l2: world(knee).distanceTo(world(ankle)),
    };
  });
  // Rotate a joint in world space, preserving the imported rig's local bone axes.
  const aim = (joint: THREE.Bone, child: THREE.Bone, target: THREE.Vector3) => {
    const origin = world(joint),
      current = world(child).sub(origin).normalize(),
      desired = target.clone().sub(origin).normalize();
    const delta = new THREE.Quaternion().setFromUnitVectors(current, desired);
    const result = delta.multiply(
      joint.getWorldQuaternion(new THREE.Quaternion()),
    );
    const parent = joint
      .parent!.getWorldQuaternion(new THREE.Quaternion())
      .invert();
    joint.quaternion.copy(parent.multiply(result));
    joint.updateWorldMatrix(false, true);
  };
  const solve = (
    upper: THREE.Bone,
    lower: THREE.Bone,
    end: THREE.Bone,
    target: THREE.Vector3,
    l1: number,
    l2: number,
    bend: THREE.Vector3,
  ) => {
    const a = world(upper),
      direction = target.clone().sub(a),
      d = Math.min(direction.length(), l1 + l2 - 0.0001);
    direction.normalize();
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
      h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    const perpendicular = bend
      .clone()
      .addScaledVector(direction, -bend.dot(direction))
      .normalize();
    const k = a
      .clone()
      .addScaledVector(direction, x)
      .addScaledVector(perpendicular, h);
    aim(upper, lower, k);
    aim(lower, end, target);
  };
  const arms = ["Left", "Right"].map((s) => {
    const upper = bone(`${s}Arm`),
      lower = bone(`${s}ForeArm`),
      hand = bone(`${s}Hand`);
    return {
      upper,
      lower,
      hand,
      l1: world(upper).distanceTo(world(lower)),
      l2: world(lower).distanceTo(world(hand)),
    };
  });
  const head = bone("Head");
  const mouth = world(head).add(new THREE.Vector3(0, 0.025, -0.19));
  let playing = false;
  return {
    group,
    mouth,
    setPlaying(value: boolean) {
      playing = value;
    },
    animate(
      count: number,
      hold: boolean,
      backward: boolean,
      dx = 0,
      dz = backward ? 0.65 : -0.65,
    ) {
      rest.forEach((r) => {
        r.bone.position.copy(r.position);
        r.bone.quaternion.copy(r.quaternion);
      });
      group.updateMatrixWorld(true);
      const direction = new THREE.Vector3(dx, 0, dz).normalize(),
        stride = Math.min(0.65, Math.hypot(dx, dz));
      legs.forEach((leg, side) => {
        const pose = footPose(count, side, hold, backward);
        const target = leg.foot
          .clone()
          .addScaledVector(direction, -pose.travel * stride);
        target.y += pose.lift;
        solve(
          leg.hip,
          leg.knee,
          leg.ankle,
          target,
          leg.l1,
          leg.l2,
          new THREE.Vector3(0, 0, -1),
        );
      });
      if (playing)
        arms.forEach((a, i) => {
          const target = mouth
            .clone()
            .add(
              new THREE.Vector3(
                i === 0 ? -0.16 : 0.07,
                i === 0 ? -0.14 : 0,
                -0.42,
              ),
            );
          solve(
            a.upper,
            a.lower,
            a.hand,
            target,
            a.l1,
            a.l2,
            new THREE.Vector3(i === 0 ? 0.7 : -0.7, -1, 0),
          );
        });
      group.updateMatrixWorld(true);
    },
  };
}
