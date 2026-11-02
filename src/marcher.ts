import * as THREE from "three";
export function marcher(hero = false) {
  const group = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({
    color: hero ? 0xe8b75e : 0x8fc1ca,
    roughness: 0.7,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x152638 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xeac56b,
    metalness: 0.8,
    roughness: 0.25,
  });
  const part = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    group.add(m);
    return m;
  };
  part(new THREE.CylinderGeometry(0.29, 0.23, 0.7, 10), cloth, 0, 1.05, 0);
  part(new THREE.SphereGeometry(0.19, 10, 8), dark, 0, 1.59, 0);
  part(new THREE.CylinderGeometry(0.23, 0.23, 0.26, 10), dark, 0, 1.8, 0);
  part(new THREE.ConeGeometry(0.09, 0.5, 6), cloth, 0, 2.15, 0);
  const legs = [-0.13, 0.13].map((x) =>
    part(new THREE.BoxGeometry(0.16, 0.65, 0.18), dark, x, 0.38, 0),
  );
  part(new THREE.BoxGeometry(0.62, 0.1, 0.13), cloth, 0, 1.16, -0.22);
  const horn = part(
    new THREE.ConeGeometry(0.19, 0.55, 12, 1, true),
    gold,
    0.1,
    1.25,
    -0.5,
  );
  horn.rotation.x = Math.PI / 2;
  return {
    group,
    animate: (count: number, hold: boolean, backward: boolean) => {
      legs.forEach((leg, i) => {
        leg.rotation.x = hold
          ? 0
          : Math.sin(count * Math.PI + i * Math.PI) * (backward ? -0.3 : 0.35);
      });
    },
  };
}
