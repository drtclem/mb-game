import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadRiggedMarcher } from "./rigged-marcher";
import "./uniform.css";

const root = document.querySelector<HTMLDivElement>("#studio")!;
root.innerHTML = `<header><a href="/">ON THE DOT <span>↗ TAKE THE FIELD</span></a><p>THE UNIFORM STUDIO <b> / 01</b></p></header>
<main><section class="copy"><p class="eyebrow">CRAFTED FOR THE FIELD</p><h1>White.<br>Silver.<br>In step.</h1><p class="description">Our original uniform, brought into 3D. Sculpted features, tailored seams, a layered plume, and a real skeleton.</p><div class="rule"></div><label for="performer">THE PERFORMER</label><select id="performer" disabled><option>Leah · first detailed character</option></select><label for="pose">THE POSE</label><select id="pose"><option value="attention">Uniform inspection · A-pose</option><option value="playing">Horn carriage · pose study</option></select><label for="motion">THE MOVEMENT</label><select id="motion"><option value="hold">Halt · attention</option><option value="forward">Forward · roll step</option><option value="backward">Backward · raised heel</option></select><button id="play">Pause animation</button><p class="note">Drag to orbit · scroll to inspect<br>First character approval · full cast still pending</p><a class="field" href="/">Try them on the field ↗</a></section>
<section class="view" aria-label="Interactive 3D marcher preview"><div id="model"></div><div class="view-top"><span>HERO UNIFORM</span><span>TEXTURED MESH / ORIGINAL CHARACTER</span></div><div class="angles"><button id="front">Front</button><button id="side">Side</button><button id="back">Back</button><button id="detail">Face detail</button></div><div class="view-bottom"><span id="name">LEAH</span><span id="count">COUNT 1</span></div></section></main><footer><span>PURE WHITE / BRUSHED SILVER / NO EPAULETTES</span><span>DETAILED CHARACTER / RIG REVIEW</span></footer>`;
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
let model: Awaited<ReturnType<typeof loadRiggedMarcher>> | undefined;
$("name").textContent = "LOADING CHARACTER…";
loadRiggedMarcher()
  .then((character) => {
    model = character;
    scene.add(model.group);
    $("name").textContent = "LEAH";
  })
  .catch((error) => {
    $("name").textContent = "Character failed to load";
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
let paused = false,
  count = 0,
  previous = performance.now();
$("play").onclick = () => {
  paused = !paused;
  $("play").textContent = paused ? "Resume animation" : "Pause animation";
};
function resize() {
  const host = $("model");
  renderer.setSize(host.clientWidth, host.clientHeight);
  camera.aspect = host.clientWidth / host.clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
function frame(now: number) {
  requestAnimationFrame(frame);
  if (!paused) count += (Math.min(0.05, (now - previous) / 1000) * 112) / 60;
  previous = now;
  const motion = ($("motion") as HTMLSelectElement).value;
  model?.setPlaying(($("pose") as HTMLSelectElement).value === "playing");
  model?.animate(
    count,
    motion === "hold",
    motion === "backward",
    0,
    motion === "backward" ? 0.65 : -0.65,
  );
  $("count").textContent = `COUNT ${(Math.floor(count) % 4) + 1}`;
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
