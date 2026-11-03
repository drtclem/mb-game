import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { twoBoneTargets } from "./skeletal-motion";
import { footPose } from "./marching-motion";
import { prepareHandGrip } from "./hand-grip";

const sources = new Map<string, Promise<GLTF>>();

/** Textures and geometry are shared; each marcher owns its skeleton. */
export async function loadRiggedMarcher(
  gender: "woman" | "man" = "woman",
  height = 1,
) {
  const url = `/models/white-marcher-${gender}.glb`;
  if (!sources.has(url))
    sources.set(
      url,
      new GLTFLoader().loadAsync(url).then((asset) => {
        asset.scene.updateMatrixWorld(true);
        asset.scene.traverse((object) => {
          if (!(object instanceof THREE.SkinnedMesh)) return;
          prepareHandGrip(object);
        });
        return asset;
      }),
    );
  const source = await sources.get(url)!;
  const gltf = { scene: clone(source.scene) };
  const group = new THREE.Group();
  group.add(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const scale = (3.7 * height) / (box.max.y - box.min.y);
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
  const inverseGroupRotation = group
    .getWorldQuaternion(new THREE.Quaternion())
    .invert();
  const legs = ["Left", "Right"].map((s) => {
    const hip = bone(`${s}UpLeg`),
      knee = bone(`${s}Leg`),
      ankle = bone(`${s}Foot`);
    return {
      hip,
      knee,
      ankle,
      foot: group.worldToLocal(world(ankle)),
      orientation: inverseGroupRotation
        .clone()
        .multiply(ankle.getWorldQuaternion(new THREE.Quaternion())),
      l1: world(hip).distanceTo(world(knee)),
      l2: world(knee).distanceTo(world(ankle)),
      toeReach: world(ankle).distanceTo(world(bone(`${s}ToeBase`))),
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
    const { knee, end: reachable } = twoBoneTargets(
      world(upper),
      target,
      l1,
      l2,
      bend,
    );
    aim(upper, lower, knee);
    aim(lower, end, reachable);
  };
  const arms = ["Left", "Right"].map((s) => {
    const upper = bone(`${s}Arm`),
      lower = bone(`${s}ForeArm`),
      hand = bone(`${s}Hand`);
    const helperName = s === "Left" ? "Bone_024" : "Bone_019";
    const helper =
      bones.find((b) => b.name === helperName) ??
      bones.find((b) => b.name.endsWith(`${s}HandMiddle3`));
    const curls = bones
      .filter(
        (b) =>
          b.name.includes(`${s}Hand`) &&
          /(?:Index|Middle|Ring|Pinky|Thumb)[123]$/.test(b.name),
      )
      .map((joint) => {
        const child = joint.children.find((c) => c instanceof THREE.Bone);
        const forward = child
          ? world(child).sub(world(joint)).normalize()
          : new THREE.Vector3(0, 1, 0);
        const axis = forward
          .clone()
          .cross(new THREE.Vector3(0, 0, -1))
          .normalize()
          .applyQuaternion(
            joint.getWorldQuaternion(new THREE.Quaternion()).invert(),
          );
        return {
          joint,
          axis,
          angle: joint.name.includes("Thumb")
            ? 0.3
            : joint.name.endsWith("1")
              ? 0.5
              : joint.name.endsWith("2")
                ? 1
                : 0.65,
        };
      });
    const fingerLocal = helper
      ? hand.worldToLocal(world(helper))
      : new THREE.Vector3(0, -0.1, 0);
    return {
      upper,
      lower,
      hand,
      fingerLocal,
      palmLocal: new THREE.Vector3(0, 0, -1).applyQuaternion(
        hand.getWorldQuaternion(new THREE.Quaternion()).invert(),
      ),
      curls,
      l1: world(upper).distanceTo(world(lower)),
      l2: world(lower).distanceTo(world(hand)),
    };
  });
  const head = bone("Head");
  const mouth = group
    .worldToLocal(world(head))
    .add(new THREE.Vector3(0, 0.025 * height, -0.19 * height));
  const handTargets = [
    mouth.clone().add(new THREE.Vector3(0.11, -0.19, -0.47)),
    mouth.clone().add(new THREE.Vector3(-0.03, 0.005, -0.43)),
  ];
  const footWorldRotation = new THREE.Quaternion();
  let playing = false;
  return {
    group,
    mouth,
    setHandTargets(left: THREE.Vector3, right: THREE.Vector3) {
      handTargets[0].copy(left);
      handTargets[1].copy(right);
    },
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
      gltf.scene.traverse((o) => {
        if (o instanceof THREE.SkinnedMesh && o.morphTargetInfluences)
          o.morphTargetInfluences[0] = playing ? 1 : 0;
      });
      group.updateMatrixWorld(true);
      const groupRotation = group.getWorldQuaternion(new THREE.Quaternion());
      const front = new THREE.Vector3(0, 0, -1).applyQuaternion(groupRotation);
      const rollAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(
        groupRotation,
      );
      const direction = new THREE.Vector3(dx, 0, dz).normalize(),
        stride = Math.min(0.65, Math.hypot(dx, dz));
      legs.forEach((leg, side) => {
        const pose = footPose(count, side, hold, backward);
        const target = leg.foot
          .clone()
          .addScaledVector(direction, -pose.travel * stride);
        // Compensate the ankle pivot so rolling the shoe does not push the toe/heel through turf.
        const contactRise =
          Math.sin(Math.abs(pose.roll)) *
          leg.toeReach *
          (pose.roll < 0 ? 1 : 0.35);
        target.y += pose.lift * height + contactRise;
        if (hold && playing) target.x *= 0.6;
        group.localToWorld(target);
        solve(leg.hip, leg.knee, leg.ankle, target, leg.l1, leg.l2, front);
        const desired = new THREE.Quaternion()
          .setFromAxisAngle(rollAxis, pose.roll)
          .multiply(
            footWorldRotation.copy(groupRotation).multiply(leg.orientation),
          );
        leg.ankle.quaternion.copy(
          leg.ankle
            .parent!.getWorldQuaternion(new THREE.Quaternion())
            .invert()
            .multiply(desired),
        );
        leg.ankle.updateWorldMatrix(false, true);
      });
      if (playing)
        arms.forEach((a, i) => {
          const target = group.localToWorld(handTargets[i].clone());
          solve(
            a.upper,
            a.lower,
            a.hand,
            target,
            a.l1,
            a.l2,
            new THREE.Vector3(i === 0 ? 0.7 : -0.7, -1, 0).applyQuaternion(
              groupRotation,
            ),
          );
          const currentFinger = a.hand
            .localToWorld(a.fingerLocal.clone())
            .sub(world(a.hand))
            .normalize();
          const desiredFinger = new THREE.Vector3(
            i === 0 ? -0.2 : 0.0,
            i === 0 ? 0.45 : -1,
            -0.6,
          )
            .normalize()
            .applyQuaternion(groupRotation);
          const wristDelta = new THREE.Quaternion().setFromUnitVectors(
            currentFinger,
            desiredFinger,
          );
          const desiredWrist = wristDelta.multiply(
            a.hand.getWorldQuaternion(new THREE.Quaternion()),
          );
          // Roll the palm inward around the tubing, rather than presenting an open palm to the audience.
          const currentPalm = a.palmLocal.clone().applyQuaternion(desiredWrist);
          currentPalm
            .addScaledVector(desiredFinger, -currentPalm.dot(desiredFinger))
            .normalize();
          const targetPalm = new THREE.Vector3(
            i === 0 ? -1 : 1,
            0,
            0,
          ).applyQuaternion(groupRotation);
          targetPalm
            .addScaledVector(desiredFinger, -targetPalm.dot(desiredFinger))
            .normalize();
          const twist = Math.atan2(
            desiredFinger.dot(currentPalm.clone().cross(targetPalm)),
            currentPalm.dot(targetPalm),
          );
          desiredWrist.premultiply(
            new THREE.Quaternion().setFromAxisAngle(desiredFinger, twist),
          );
          a.hand.quaternion.copy(
            a.hand
              .parent!.getWorldQuaternion(new THREE.Quaternion())
              .invert()
              .multiply(desiredWrist),
          );
          for (const curl of a.curls)
            curl.joint.quaternion.multiply(
              new THREE.Quaternion().setFromAxisAngle(curl.axis, curl.angle * (i === 0 ? 1 : 0.55)),
            );
          a.hand.updateWorldMatrix(false, true);
        });
      group.updateMatrixWorld(true);
    },
  };
}
