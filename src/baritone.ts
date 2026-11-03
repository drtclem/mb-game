import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let source: Promise<THREE.Group> | undefined;

/** Normalize the original generated rigid instrument around its mouthpiece. */
export async function loadBaritone() {
  source ??= new GLTFLoader()
    .loadAsync("/models/silver-baritone.glb")
    .then((gltf) => {
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const points: THREE.Vector3[] = [];
      model.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const p = o.geometry.getAttribute("position");
        for (let i = 0; i < p.count; i++)
          points.push(
            new THREE.Vector3()
              .fromBufferAttribute(p, i)
              .applyMatrix4(o.matrixWorld),
          );
        o.castShadow = true;
        o.receiveShadow = true;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => {
          if (!(m instanceof THREE.MeshStandardMaterial)) return;
          m.metalness = 1;
          m.metalnessMap = null;
          m.roughness = 0.23;
          m.roughnessMap = null;
          m.envMapIntensity = 1.1;
          m.side = THREE.DoubleSide;
        });
      });
      const bounds = new THREE.Box3().setFromPoints(points),
        size = bounds.getSize(new THREE.Vector3());
      const axis =
        size.x > size.z
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(0, 0, 1);
      const values = points.map((p) => p.dot(axis));
      const low = Math.min(...values),
        high = Math.max(...values),
        span = high - low;
      const endPoints = (top: boolean) =>
        points.filter((_, i) =>
          top ? values[i] > high - span * 0.04 : values[i] < low + span * 0.04,
        );
      const lowPoints = endPoints(false),
        highPoints = endPoints(true);
      const spread = (p: THREE.Vector3[]) => {
        const s = new THREE.Box3()
          .setFromPoints(p)
          .getSize(new THREE.Vector3());
        return s.y * (size.x > size.z ? s.z : s.x);
      };
      const bellAtHigh = spread(highPoints) > spread(lowPoints);
      const mouthPoints = bellAtHigh ? lowPoints : highPoints;
      const mouth = mouthPoints
        .reduce((sum, p) => sum.add(p), new THREE.Vector3())
        .multiplyScalar(1 / mouthPoints.length);
      if (!bellAtHigh) axis.negate();
      const wrapper = new THREE.Group();
      wrapper.add(model);
      wrapper.quaternion.setFromUnitVectors(axis, new THREE.Vector3(0, 0, -1));
      const scale = 1.25 / span;
      wrapper.scale.setScalar(scale);
      const result = new THREE.Group();
      result.add(wrapper);
      wrapper.position
        .copy(mouth)
        .applyQuaternion(wrapper.quaternion)
        .multiplyScalar(-scale);
      result.name = "Original silver-plated marching baritone";
      return result;
    });
  const group = (await source).clone(true);
  return {
    group,
    leftGrip: new THREE.Vector3(0.08, -0.14, -0.5),
    rightGrip: new THREE.Vector3(-0.12, 0.16, -0.43),
  };
}
