import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { footPose, haltFootPose } from "./marching-motion";
import { twoBoneTargets } from "./skeletal-motion";
import { legWeights } from "./combined-skin";

const loader = new GLTFLoader();
const sources = new Map<string, ReturnType<GLTFLoader["loadAsync"]>>();
type Surface = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
};
const prepared = new Map<
  string,
  Promise<{ body: Surface; feet: THREE.Vector3[] }>
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
          feet = [1, -1].map((side) => {
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
        return { body: source, feet };
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
  source: { body: Surface; feet: THREE.Vector3[] },
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
  return {
    group,
    animate(
      count: number,
      hold: boolean,
      backward: boolean,
      dx = 0,
      dz = backward ? 1 : -1,
      closure = 1,
      preparation = 0,
    ) {
      const orientation = group.getWorldQuaternion(new THREE.Quaternion());
      const direction = new THREE.Vector3(dx, 0, dz).normalize(),
        stride = Math.hypot(dx, dz) / height;
      for (const leg of legs) {
        leg.hip.quaternion.identity();
        leg.knee.quaternion.identity();
        leg.ankle.quaternion.identity();
      }
      const targets = legs.map((leg, i) => {
        const pose =
          hold && closure < 1
            ? haltFootPose(i, closure)
            : footPose(count, i, hold, backward);
        if (preparation > 0) {
          pose.travel = i === 0 ? -0.5 * preparation : 0;
          pose.lift = i === 0 ? 0.04 * Math.sin(Math.PI * preparation) : 0;
          pose.roll = 0;
        }
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
      // Lower the pelvis only as far as needed to keep ordinary strides reachable.
      // Foot targets stay on the field; the rigid upper body never deforms.
      const drop = Math.max(
        -0.12,
        Math.min(
          0,
          ...legs.map((leg, i) => {
            const target = targets[i].target;
            const horizontal =
              (target.x - leg.hip.position.x) ** 2 +
              (target.z - leg.hip.position.z) ** 2;
            const reach = leg.l1 + leg.l2 - 1e-4;
            return (
              target.y +
              Math.sqrt(Math.max(0, reach * reach - horizontal)) -
              leg.hip.position.y
            );
          }),
        ),
      );
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
        const desired = new THREE.Quaternion()
          .setFromAxisAngle(
            new THREE.Vector3(1, 0, 0).applyQuaternion(orientation),
            pose.roll,
          )
          .multiply(orientation);
        leg.ankle.quaternion.copy(
          leg.ankle
            .parent!.getWorldQuaternion(new THREE.Quaternion())
            .invert()
            .multiply(desired),
        );
        leg.ankle.updateWorldMatrix(false, true);
      });
    },
  };
}
