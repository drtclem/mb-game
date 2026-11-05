import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadCombinedMarcher } from "./combined-marcher";
import { rehearsalPose } from "./lower-body";
import "./marching-preview.css";

const $ = (id: string) => document.getElementById(id)!;
$("movement").innerHTML =
  `<header><a href="/">ON THE DOT ↗</a><span>MOVEMENT STUDY / 01</span><a href="/uniform.html">Uniform studio ↗</a></header>
<main><aside><p class="eyebrow">ONE MARCHER. EVERY CONTACT.</p><h1>Step.<br>Plant.<br>Close.</h1><p>Eight standard steps, then a halt. Slow it down or drag through any count to check the feet.</p><div class="legend"><b class="left">● LEFT</b><b class="right">● RIGHT</b></div><div class="settings"><div><label for="direction">DIRECTION</label><select id="direction"><option value="forward">Forward · heel to toe</option><option value="backward">Backward · on the toes</option></select></div><div><label for="performer">PERFORMER</label><select id="performer"><option value="woman">Woman</option><option value="man">Man</option></select></div></div><label class="check"><input id="anchors" type="checkbox" checked> Show foot anchors</label><label class="check"><input id="guides" type="checkbox"> Show leg guides</label><p class="note">Left on 1, 3, 5, 7.<br>Right on 2, 4, 6, 8.<br>Left closes on the next 1.</p><p class="note">This is the new animation review. Use the side or feet view to check that a planted foot stays on its ground mark.</p></aside>
<section class="study" aria-label="Slow-motion marching preview"><div class="scene-wrap"><div id="canvas"></div><div class="status"><span class="eyebrow">84 BPM · 8-TO-5 STEPS</span><strong id="phase" role="status">LOADING MARCHER…</strong><p id="load-error" role="alert"></p></div><div class="angles" aria-label="Camera views"><button data-view="side" aria-pressed="true">Side</button><button data-view="front" aria-pressed="false">Front</button><button data-view="back" aria-pressed="false">Back</button><button data-view="feet" aria-pressed="false">Feet</button></div><div class="feet-status"><div class="left">LEFT<span id="left-state">SET</span></div><div class="right">RIGHT<span id="right-state">SET</span></div></div></div>
<div class="controls"><div class="transport"><div><button id="previous" aria-label="Previous count">←</button><button id="play" class="primary">Pause</button><button id="next" aria-label="Next count">→</button><button id="reset" aria-label="Restart sequence">↺</button></div><div><label for="speed" class="sr-only">Playback speed</label><select id="speed"><option value="0.125">⅛ speed</option><option value="0.25" selected>¼ speed</option><option value="0.5">½ speed</option><option value="1">Full speed</option></select><label class="loop"><input id="loop" type="checkbox" checked> Loop</label></div></div><label for="scrub" class="sr-only">Sequence count</label><input id="scrub" type="range" min="-1" max="9" step="0.01" value="-1" aria-valuetext="Set"><div class="marks">${[-1, -0.5, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((c, i) => `<button data-count="${c}">${i === 0 ? "SET" : i === 1 ? "&" : i === 10 ? "HOLD 1" : i - 1}</button>`).join("")}</div><p class="hint">Drag to orbit · Space to pause · Arrow keys move ¼ count · Ground rings show fixed foot placements</p></div></section></main>`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1723);
scene.fog = new THREE.Fog(0x0b1723, 18, 45);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$("canvas").append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * 0.49;
const pmrem = new THREE.PMREMGenerator(renderer),
  environment = new RoomEnvironment();
scene.environment = pmrem.fromScene(environment).texture;
pmrem.dispose();
environment.dispose();
scene.environmentIntensity = 0.65;
scene.add(new THREE.HemisphereLight(0xd6efff, 0x354044, 1.5));
const light = new THREE.DirectionalLight(0xfff1df, 2.5);
light.position.set(-3, 9, -3);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
Object.assign(light.shadow.camera, {
  left: -12,
  right: 12,
  top: 12,
  bottom: -12,
});
light.shadow.normalBias = 0.02;
scene.add(light);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x233d42, roughness: 0.95 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(60, 60, 0x668080, 0x344f54);
grid.position.y = 0.005;
scene.add(grid);
const colors = [0x8cddd9, 0xefc785];
const anchorGroup = new THREE.Group();
scene.add(anchorGroup);
const ring = (color: number, radius: number) => {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.012, radius, 40),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  return mesh;
};
const anchors = colors.map((color) => {
  const marker = ring(color, 0.13);
  anchorGroup.add(marker);
  return marker;
});
const footprintGroup = new THREE.Group();
anchorGroup.add(footprintGroup);
function textSprite(text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const c = canvas.getContext("2d")!;
  c.fillStyle = color;
  c.textAlign = "center";
  c.font = "bold 30px monospace";
  c.fillText(text, 64, 42);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(0.55, 0.275, 1);
  return sprite;
}
const footprints = Array.from({ length: 8 }, (_, i) => {
  const foot = i % 2,
    mark = ring(colors[foot], 0.09),
    label = textSprite(
      `${i + 1}${foot === 0 ? "L" : "R"}`,
      foot === 0 ? "#8cddd9" : "#efc785",
    );
  footprintGroup.add(mark, label);
  return { mark, label, foot, distance: i + 1 };
});
const bodyMark = ring(0xf3f0e3, 0.045);
scene.add(bodyMark);
const legGuides = colors.map((color) => {
  const line = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color, depthTest: false }),
  );
  line.renderOrder = 10;
  scene.add(line);
  return line;
});
let actor: Awaited<ReturnType<typeof loadCombinedMarcher>> | undefined;
let loading = 0,
  count = -1,
  playing = true,
  speed = 0.25,
  previousBody = 0,
  lastTime = performance.now(),
  view = "side";
function setView(next: string) {
  view = next;
  const z = rehearsalPose(
    count,
    ($("direction") as HTMLSelectElement).value === "backward",
  ).body.z;
  const feet = next === "feet";
  controls.target.set(0, feet ? 0.75 : 1.75, z);
  camera.position.set(
    next === "front" ? 0 : next === "back" ? 0 : feet ? 4.7 : 8.5,
    feet ? 1.4 : 2.5,
    z + (next === "front" ? -8.5 : next === "back" ? 8.5 : 0.6),
  );
  controls.update();
  document
    .querySelectorAll<HTMLButtonElement>("[data-view]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.view === next)),
    );
}
async function load() {
  const token = ++loading;
  $("phase").textContent = "LOADING MARCHER…";
  $("load-error").textContent = "";
  try {
    const next = await loadCombinedMarcher(
      ($("performer") as HTMLSelectElement).value as "woman" | "man",
    );
    if (token !== loading) return;
    if (actor) scene.remove(actor.group);
    actor = next;
    scene.add(actor.group);
  } catch {
    $("load-error").textContent =
      "The marcher could not load. Refresh to try again.";
  }
}
function seek(next: number) {
  count = Math.max(-1, Math.min(9, next));
  playing = false;
  $("play").textContent = "Play";
}
$("play").onclick = () => {
  playing = !playing;
  $("play").textContent = playing ? "Pause" : "Play";
};
$("previous").onclick = () => seek(Math.ceil(count - 0.001) - 1);
$("next").onclick = () => seek(Math.floor(count + 0.001) + 1);
$("reset").onclick = () => seek(-1);
$("scrub").oninput = () => seek(Number(($("scrub") as HTMLInputElement).value));
$("speed").onchange = () => {
  speed = Number(($("speed") as HTMLSelectElement).value);
};
$("direction").onchange = () => {
  previousBody = rehearsalPose(
    count,
    ($("direction") as HTMLSelectElement).value === "backward",
  ).body.z;
  setView(view);
};
$("performer").onchange = () => {
  void load();
};
document
  .querySelectorAll<HTMLButtonElement>("[data-count]")
  .forEach((b) => (b.onclick = () => seek(Number(b.dataset.count))));
document
  .querySelectorAll<HTMLButtonElement>("[data-view]")
  .forEach((b) => (b.onclick = () => setView(b.dataset.view!)));
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input,select,textarea,button")) return;
  if (e.key === " ") {
    e.preventDefault();
    $("play").click();
  }
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    seek(count + (e.key === "ArrowRight" ? 0.25 : -0.25));
  }
});
new ResizeObserver(() => {
  const width = $("canvas").clientWidth,
    height = $("canvas").clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}).observe($("canvas"));
setView("side");
void load();
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (playing && actor) {
    count += ((dt * 84) / 60) * speed;
    if (count > 9) {
      if (($("loop") as HTMLInputElement).checked) count = -1;
      else {
        count = 9;
        playing = false;
        $("play").textContent = "Play";
      }
    }
  }
  const backward = ($("direction") as HTMLSelectElement).value === "backward",
    pose = rehearsalPose(count, backward);
  const delta = pose.body.z - previousBody;
  camera.position.z += delta;
  controls.target.z += delta;
  previousBody = pose.body.z;
  if (actor) {
    actor.poseLowerBody(pose);
    if ($("phase").textContent !== pose.label)
      $("phase").textContent = pose.label;
  }
  ($("scrub") as HTMLInputElement).value = String(count);
  $("scrub").setAttribute("aria-valuetext", pose.label);
  for (let i = 0; i < 2; i++) {
    const foot = pose.feet[i];
    anchors[i].position.set(foot.x, 0.012, foot.z);
    (anchors[i].material as THREE.MeshBasicMaterial).opacity = foot.planted
      ? 1
      : 0.25;
    $(i === 0 ? "left-state" : "right-state").textContent = foot.planted
      ? "PLANTED"
      : "IN SWING";
    const names =
      i === 0
        ? ["LeftHip", "LeftKnee", "LeftAnkle"]
        : ["RightHip", "RightKnee", "RightAnkle"];
    legGuides[i].visible = !!actor && ($("guides") as HTMLInputElement).checked;
    if (actor && legGuides[i].visible) {
      actor.group.updateMatrixWorld(true);
      legGuides[i].geometry.setFromPoints(
        names.map((name) =>
          actor!.group
            .getObjectByName(name)!
            .getWorldPosition(new THREE.Vector3()),
        ),
      );
    }
  }
  anchorGroup.visible = ($("anchors") as HTMLInputElement).checked;
  footprints.forEach(({ mark, label, foot, distance }) => {
    const z = distance * (backward ? 1 : -1);
    mark.position.set(foot === 0 ? -0.12 : 0.12, 0.012, z);
    label.position.set(0.6, 0.09, z);
  });
  bodyMark.position.set(0, 0.014, pose.body.z);
  document.querySelectorAll<HTMLButtonElement>("[data-count]").forEach((b) => {
    const n = Number(b.dataset.count);
    b.classList.toggle(
      "active",
      n === -1
        ? count < -0.5
        : n === -0.5
          ? count >= -0.5 && count < 0
          : n === 8
            ? count >= 8
            : Math.floor(count) === n,
    );
  });
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
