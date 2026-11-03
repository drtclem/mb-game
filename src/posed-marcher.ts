import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** One combined sculpt: do not attach a second horn or run the rejected arm IK. */
export async function loadPosedMarcher() {
  const { scene } = await new GLTFLoader().loadAsync(
    "/models/posed-baritone-woman.glb",
  );
  const bounds = new THREE.Box3().setFromObject(scene);
  const scale = 3.7 / bounds.getSize(new THREE.Vector3()).y;
  const group = new THREE.Group();
  scene.scale.setScalar(scale);
  scene.position.y = -bounds.min.y * scale;
  scene.rotation.y = Math.PI;
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials)
      if (material instanceof THREE.MeshStandardMaterial)
        material.envMapIntensity = 0.8;
  });
  group.add(scene);
  return group;
}
