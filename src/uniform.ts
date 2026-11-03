import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadPosedMarcher } from "./posed-marcher";
import "./uniform.css";

const root = document.querySelector<HTMLDivElement>("#studio")!;
root.innerHTML = `<header><a href="/">ON THE DOT <span>↗ TAKE THE FIELD</span></a><p>THE UNIFORM STUDIO <b> / 02</b></p></header>
<main><section class="copy"><p class="eyebrow">ONE COMPLETE PLAYING POSE</p><h1>White.<br>Silver.<br>Together.</h1><p class="description">The marcher, hands, and baritone are one original sculpt. A fixed playing pose to inspect before adding marching movement.</p><div class="rule"></div><p class="eyebrow">THE PERFORMER</p><p>Woman · combined pose prototype</p><p class="eyebrow">THE GRIP</p><p>Right fingertips on the valves.<br>Left hand around the valve block.</p><p class="note">Drag to orbit · scroll to inspect<br>One prototype · not yet the full cast</p><a class="field" href="/">Current field rehearsal ↗</a></section>
<section class="view" aria-label="Interactive 3D marcher preview"><div id="model"></div><div class="view-top"><span>COMBINED POSE / 02</span><span>ORIGINAL TEXTURED 3D SCULPT</span></div><div class="angles"><button id="front">Front</button><button id="side">Side</button><button id="back">Back</button><button id="detail">Face & horn</button></div><div class="view-bottom"><span id="name">LOADING…</span><span>STATIC POSE REVIEW</span></div></section></main><footer><span>PURE WHITE / BRUSHED SILVER / NO EPAULETTES</span><span>FIXED UPPER BODY / ORIGINAL CHARACTER</span></footer>`;
const $ = (id: string) => document.getElementById(id)!;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1422);
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
$("model").append(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer),
  room = new RoomEnvironment();
const environment = pmrem.fromScene(room);
scene.environment = environment.texture;
room.dispose();
pmrem.dispose();
scene.environmentIntensity = 0.65;
scene.add(new THREE.HemisphereLight(0xeaf3ff, 0x526077, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 2);
key.position.set(-3, 6, -5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -3;
key.shadow.camera.right = 3;
key.shadow.camera.top = 5;
key.shadow.camera.bottom = -3;
key.shadow.normalBias = 0.015;
scene.add(key);
const rim = new THREE.DirectionalLight(0xc6d9ff, 1.5);
rim.position.set(3, 4, 3);
scene.add(rim);
const base = new THREE.Mesh(
  new THREE.CylinderGeometry(1.65, 1.7, 0.12, 80),
  new THREE.MeshStandardMaterial({
    color: 0x1e2c3e,
    roughness: 0.55,
    metalness: 0.15,
  }),
);
base.position.y = -0.06;
base.receiveShadow = true;
scene.add(base);
const trim = new THREE.Mesh(
  new THREE.TorusGeometry(1.65, 0.009, 6, 100),
  new THREE.MeshStandardMaterial({
    color: 0xd5af66,
    metalness: 0.7,
    roughness: 0.3,
  }),
);
trim.rotation.x = Math.PI / 2;
trim.position.y = -0.005;
scene.add(trim);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.85, 0);
controls.enableDamping = true;
controls.minDistance = 1.4;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.51;
camera.position.set(4, 2.8, -7);
void loadPosedMarcher()
  .then((model) => {
    scene.add(model);
    $("name").textContent = "COMBINED PROTOTYPE";
  })
  .catch((error) => {
    $("name").textContent = "Model failed to load · reload to retry";
    console.error(error);
  });
for (const [id, position] of Object.entries({
  front: [0, 2.2, -8],
  side: [8, 2.2, 0],
  back: [0, 2.2, 8],
  detail: [1, 2.9, -2.5],
}))
  $(id).onclick = () => {
    camera.position.set(...(position as [number, number, number]));
    controls.target.set(
      0,
      id === "detail" ? 2.5 : 1.85,
      id === "detail" ? -0.4 : 0,
    );
  };
function resize() {
  const host = $("model");
  renderer.setSize(host.clientWidth, host.clientHeight);
  camera.aspect = host.clientWidth / host.clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
function frame() {
  requestAnimationFrame(frame);
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
