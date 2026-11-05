import * as THREE from "three";
import { rehearsalPose, type LowerBodyPose } from "./lower-body";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { footPose, haltFootPose, stepOffFootPose } from "./marching-motion";
import { twoBoneTargets } from "./skeletal-motion";
import { legWeights, FOOT_SIDES } from "./combined-skin";

const loader = new GLTFLoader();
const sources = new Map<string, ReturnType<GLTFLoader["loadAsync"]>>();
type Surface = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
};
const prepared = new Map<
  string,
  Promise<{ body: Surface; feet: THREE.Vector3[]; shoeYaw: number[] }>
>();

function surface(scene: THREE.Group): Surface {
  scene.updateMatrixWorld(true);
  let mesh: THREE.Mesh | undefined;
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) mesh = o;
  });
  if (!mesh) throw Error("Combined character has no mesh");
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  const bounds = new THREE.Box3().setFromBufferAttribute(
    geometry.getAttribute("position") as THREE.BufferAttribute,
  );
  geometry
    .translate(0, -bounds.min.y, 0)
    .scale(
      3.7 / (bounds.max.y - bounds.min.y),
      3.7 / (bounds.max.y - bounds.min.y),
      3.7 / (bounds.max.y - bounds.min.y),
    );
  geometry.rotateY(Math.PI);
  const points = geometry.getAttribute("position"),
    footBox = new THREE.Box3();
  for (let i = 0; i < points.count; i++)
    if (points.getY(i) < 0.22)
      footBox.expandByPoint(new THREE.Vector3().fromBufferAttribute(points, i));
  const center = footBox.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, 0, -center.z);
  return { geometry, material: mesh.material };
}

/** Measure the authored sole's long axis, rather than assuming bone zero means straight. */
export function authoredShoeYaw(
  points: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  side: number,
) {
  const sole: [number, number][] = [];
  for (let i = 0; i < points.count; i++)
    if (points.getY(i) < 0.12 && points.getX(i) * side > 0.03)
      sole.push([points.getX(i), points.getZ(i)]);
  if (sole.length < 3) return 0;
  const cx = sole.reduce((sum, p) => sum + p[0], 0) / sole.length;
  const cz = sole.reduce((sum, p) => sum + p[1], 0) / sole.length;
  let xx = 0,
    zz = 0,
    xz = 0;
  for (const [x, z] of sole) {
    xx += (x - cx) ** 2;
    zz += (z - cz) ** 2;
    xz += (x - cx) * (z - cz);
  }
  // Principal axis relative to Z; keep the forward-facing solution.
  return 0.5 * Math.atan2(2 * xz, zz - xx);
}

async function prepare(gender: "woman" | "man") {
  if (!prepared.has(gender))
    prepared.set(
      gender,
      (async () => {
        if (!sources.has(gender))
          sources.set(
            gender,
            loader.loadAsync(
              gender === "woman"
                ? "/models/posed-baritone-woman.glb"
                : "/models/posed-baritone-man.glb",
            ),
          );
        const source = surface((await sources.get(gender)!).scene);
        const p = source.geometry.getAttribute("position"),
          // Characters face -Z: anatomical left is -X, right is +X.
          feet = FOOT_SIDES.map((side) => {
            const box = new THREE.Box3();
            for (let i = 0; i < p.count; i++)
              if (p.getY(i) < 0.22 && p.getX(i) * side > 0.03)
                box.expandByPoint(
                  new THREE.Vector3().fromBufferAttribute(p, i),
                );
            const at = box.getCenter(new THREE.Vector3());
            at.y = 0.17;
            at.z += 0.08;
            return at;
          });
        const joints: number[] = [],
          weights: number[] = [];
        for (let i = 0; i < p.count; i++) {
          const w = legWeights(p.getX(i), p.getY(i), 1.5, 0.84, 0.2);
          joints.push(...w.joints);
          weights.push(...w.weights);
        }
        source.geometry.setAttribute(
          "skinIndex",
          new THREE.Uint16BufferAttribute(joints, 4),
        );
        source.geometry.setAttribute(
          "skinWeight",
          new THREE.Float32BufferAttribute(weights, 4),
        );
        return {
          body: source,
          feet,
          shoeYaw: FOOT_SIDES.map((side) => authoredShoeYaw(p, side)),
        };
      })(),
    );
  return prepared.get(gender)!;
}

export async function loadCombinedMarcher(
  gender: "woman" | "man" = "woman",
  height = 1,
) {
  return rigCombinedSurface(await prepare(gender), height);
}

export function rigCombinedSurface(
  source: { body: Surface; feet: THREE.Vector3[]; shoeYaw?: number[] },
  height = 1,
) {
  const group = new THREE.Group();
  group.scale.setScalar(height);
  const root = new THREE.Bone();
  root.name = "Fixed torso, arms, hands and horn";
  const bones = [root];
  const legs = source.feet.map((foot, i) => {
    const hip = new THREE.Bone(),
      knee = new THREE.Bone(),
      ankle = new THREE.Bone();
    hip.name = `${i ? "Right" : "Left"}Hip`;
    knee.name = `${i ? "Right" : "Left"}Knee`;
    ankle.name = `${i ? "Right" : "Left"}Ankle`;
    hip.position.set(foot.x * 0.75, 1.5, foot.z);
    knee.position.set(foot.x * 0.25, -0.66, -0.015);
    ankle.position.set(0, -0.67, 0.015);
    root.add(hip);
    hip.add(knee);
    knee.add(ankle);
    bones.push(hip, knee, ankle);
    return {
      hip,
      knee,
      ankle,
      foot: foot.clone(),
      l1: knee.position.length(),
      l2: ankle.position.length(),
    };
  });
  const mesh = new THREE.SkinnedMesh(
    source.body.geometry,
    source.body.material,
  );
  mesh.add(root);
  group.add(mesh);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  function aim(joint: THREE.Bone, child: THREE.Bone, target: THREE.Vector3) {
    const origin = world(joint),
      delta = new THREE.Quaternion().setFromUnitVectors(
        world(child).sub(origin).normalize(),
        target.clone().sub(origin).normalize(),
      );
    const q = delta.multiply(joint.getWorldQuaternion(new THREE.Quaternion()));
    joint.quaternion.copy(
      joint
        .parent!.getWorldQuaternion(new THREE.Quaternion())
        .invert()
        .multiply(q),
    );
    joint.updateWorldMatrix(false, true);
  }
  function solveTargets(
    targets: {
      pose: { roll: number; yaw?: number; straighten?: boolean };
      target: THREE.Vector3;
    }[],
    softKnees = false,
  ) {
    const orientation = group.getWorldQuaternion(new THREE.Quaternion());
    for (const leg of legs) {
      leg.hip.quaternion.identity();
      leg.knee.quaternion.identity();
      leg.ankle.quaternion.identity();
    }
    // Lower the pelvis only as far as needed to keep ordinary strides reachable.
    // Foot targets stay on the field; the rigid upper body never deforms.
    const reaches = legs.map((leg, i) => {
      const target = targets[i].target;
      const horizontal =
        (target.x - leg.hip.position.x) ** 2 +
        (target.z - leg.hip.position.z) ** 2;
      const reach = leg.l1 + leg.l2 - (softKnees ? 0.008 : 1e-4);
      return (
        target.y +
        Math.sqrt(Math.max(0, reach * reach - horizontal)) -
        leg.hip.position.y
      );
    });
    // A smooth minimum avoids a knee-lock pop when support changes sides.
    const minimum = Math.min(0, ...reaches);
    const floor = softKnees
      ? minimum -
        Math.log(
          [0, ...reaches].reduce(
            (sum, value) => sum + Math.exp((minimum - value) * 100),
            0,
          ),
        ) /
          100
      : minimum;
    const drop = Math.max(softKnees ? -0.18 : -0.12, floor);
    group.position.y = drop * height;
    group.updateMatrixWorld(true);
    legs.forEach((leg, i) => {
      const { pose, target } = targets[i];
      target.y -= drop;
      group.localToWorld(target);
      const solved = twoBoneTargets(
        world(leg.hip),
        target,
        leg.l1 * height,
        leg.l2 * height,
        new THREE.Vector3(-leg.hip.position.x * 0.4, 0, -1)
          .normalize()
          .applyQuaternion(orientation),
      );
      aim(leg.hip, leg.knee, solved.knee);
      aim(leg.knee, leg.ankle, solved.end);
      const yaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        pose.yaw ?? 0,
      );
      const desired = orientation
        .clone()
        .multiply(yaw)
        .multiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            pose.roll,
          ),
        );
      if (pose.straighten)
        desired.multiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            -(source.shoeYaw?.[i] ?? 0),
          ),
        );
      leg.ankle.quaternion.copy(
        leg.ankle
          .parent!.getWorldQuaternion(new THREE.Quaternion())
          .invert()
          .multiply(desired),
      );
      leg.ankle.updateWorldMatrix(false, true);
    });
  }
  return {
    group,
    poseLowerBody(frame: LowerBodyPose) {
      group.position.set(frame.body.x, 0, frame.body.z);
      const targets = legs.map((leg, i) => {
        const foot = frame.feet[i],
          roll = foot.roll;
        const pivot = roll >= 0 ? 0.08 : -0.2;
        // Rotate about the heel/forefoot contact, keeping the ground anchor fixed.
        const target = new THREE.Vector3(
          (foot.x - frame.body.x) / height,
          leg.foot.y * Math.cos(roll) +
            pivot * Math.sin(roll) +
            foot.lift / height,
          leg.foot.z +
            (foot.z - frame.body.z) / height +
            leg.foot.y * Math.sin(roll) +
            pivot * (1 - Math.cos(roll)),
        );
        return { pose: { roll, yaw: foot.yaw, straighten: true }, target };
      });
      solveTargets(targets, true);
    },
    /** Apply the reviewed gait around the gameplay-owned position and stride. */
    animateReviewed(
      count: number,
      hold: boolean,
      backward: boolean,
      dx = 0,
      dz = backward ? 1 : -1,
      closure = 1,
      preparation = 0,
    ) {
      const phase = (((count - 1) % 2) + 2) % 2;
      const sample =
        preparation > 0
          ? -0.5 + preparation * 0.5
          : hold
            ? closure < 1
              ? 7 + closure
              : 8
            : 2 + phase;
      const frame = rehearsalPose(sample, backward);
      const body = { x: group.position.x, z: group.position.z };
      const stride = Math.hypot(dx, dz);
      const direction =
        stride > 0.0001
          ? { x: dx / stride, z: dz / stride }
          : { x: 0, z: backward ? 1 : -1 };
      const sign = backward ? 1 : -1;
      const targets = legs.map((leg, i) => {
        const foot = frame.feet[i];
        const turnout = Math.abs(foot.yaw) / (Math.PI / 4);
        const stanceZ =
          i === 0 ? -0.12 * turnout + 0.08 * (1 - Math.cos(foot.yaw)) : 0;
        const along =
          ((foot.z - frame.body.z - stanceZ) * sign * stride) / height;
        const roll = foot.roll;
        const pivot = roll >= 0 ? 0.08 : -0.2;
        const target = new THREE.Vector3(
          foot.x + direction.x * along,
          leg.foot.y * Math.cos(roll) + pivot * Math.sin(roll) + foot.lift,
          leg.foot.z +
            direction.z * along +
            leg.foot.y * Math.sin(roll) +
            pivot * (1 - Math.cos(roll)),
        );
        // Halt heel-to-arch geometry belongs to the facing, independent of travel.
        target.z += stanceZ;
        return { pose: { roll, yaw: foot.yaw, straighten: true }, target };
      });
      solveTargets(targets, true);
      group.position.x = body.x;
      group.position.z = body.z;
    },
    animate(
      count: number,
      hold: boolean,
      backward: boolean,
      dx = 0,
      dz = backward ? 1 : -1,
      closure = 1,
      preparation = 0,
    ) {
      const direction = new THREE.Vector3(dx, 0, dz).normalize(),
        stride = Math.hypot(dx, dz) / height;
      const targets = legs.map((leg, i) => {
        const pose =
          preparation > 0
            ? stepOffFootPose(preparation, i, backward)
            : hold && closure < 1
              ? haltFootPose(i, closure)
              : footPose(count, i, hold, backward);
        const target = leg.foot.clone();
        // Track beneath the body rather than preserving the modeling pose's wide stance.
        target.x *= 0.45;
        target.addScaledVector(direction, -pose.travel * stride);
        // A heel contact has a shorter lever from the ankle than a toe contact.
        target.y +=
          pose.lift * (stride < 0.1 ? 2.5 : 1) +
          Math.sin(Math.abs(pose.roll)) * (pose.roll < 0 ? 0.2 : 0.08);
        return { pose, target };
      });
      solveTargets(targets);
    },
  };
}
