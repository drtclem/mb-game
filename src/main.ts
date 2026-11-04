import * as THREE from "three";
import "./style.css";
import { distance, type Dot } from "./drill";
import { shows, difficulties, tuning, type Difficulty } from "./repertoire";
import {
  PerformanceRun,
  formMetrics,
  type Result,
  type Step,
  type Steering,
} from "./performance";
import { Playback } from "./playback";
import { Controls } from "./controls";
import { RoomClient, type Packet } from "./multiplayer";
import { readProgress, recordResult } from "./progress";
import { conduct } from "./drum-major";
import {
  haltClosure,
  stepOffPreparation,
  haltBodyOffset,
} from "./marching-motion";
import { stepAnimation } from "./step-animation";
import { countDisplay, moveDisplay } from "./count-display";
import { nextMovePreview } from "./next-move";
import { loadCombinedMarcher } from "./combined-marcher";
import { roster } from "./marching-motion";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const $ = (id: string) => document.getElementById(id)!;
const esc = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let selected = shows[0],
  difficulty: Difficulty = "Medium",
  playerId = 5;
let mode: "menu" | "lobby" | "loading" | "run" | "recap" | "calibrate" = "menu";
let run: PerformanceRun | undefined,
  playback: Playback | undefined,
  room: RoomClient | undefined;
let lastPage = -1,
  lastSend = 0,
  startedRun = "",
  rejoinUntil = 0,
  lastBandBeat = 0;
let fieldStyle = "";
let overhead = false,
  muted = false,
  warningUntil = 0,
  warningAt = -10,
  roomInterrupted = false,
  returningControl = false;
let calibration = Number(localStorage.getItem("mb-calibration") ?? 0),
  calStart = 0,
  calLastBeat = -1,
  calGaps: number[] = [];
let bandSamples: number[] = [];
const controls = new Controls(),
  remote = new Map<
    string,
    { position: Dot; count: number; step?: Step; at: number }
  >(),
  results = new Map<
    string,
    { result: Result; incomplete: boolean; band: number }
  >();
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<main><header><a class="brand" href="/">ON THE DOT<span>THE FIELD IS LISTENING</span></a><span class="edition">BRASS / RHYTHM / FORM</span><button id="sound">Sound on</button></header><section id="stage"><div id="scene"></div><div id="labels"></div><div id="hud" hidden><div id="motion-state" role="status"></div><section id="move-card" aria-label="Current and next move"><div id="page"></div><div class="move-row"><span class="move-label">NOW</span><div><strong id="current-move"></strong><small id="current-detail"></small></div><b id="counts-left"></b></div><div id="set-progress" aria-label="Progress through eight counts">${Array.from({ length: 8 }, () => "<i></i>").join("")}</div><div class="move-row next"><span class="move-label">NEXT</span><div><strong id="next-move"></strong><small id="next-detail"></small></div></div></section><section id="count-panel" aria-label="Musical count"><div class="count-caption"><span id="count-label"></span><b id="count-position"></b></div><div id="beat">${Array.from({ length: 4 }, (_, i) => `<span class="pulse-block ${i === 0 ? "downbeat" : ""}">${i + 1}</span>`).join("")}</div></section><aside id="move-preview" hidden role="status"><span id="preview-arrow" aria-hidden="true">↑</span><div><strong id="preview-count"></strong><small id="preview-name"></small></div></aside><div id="feedback" role="status"></div><canvas id="map" width="310" height="170" aria-label="Field overview"></canvas><canvas id="conductor" width="160" height="205" aria-label="Drum major conducting the musical count"></canvas><button id="view">Overhead</button><button id="pause">Pause</button><button id="recenter" hidden>Recenter tilt</button><button id="rhythm" hidden aria-label="Tap once for each step">STEP<span>tap the count</span></button></div><div id="overlay"></div><div id="notice" role="status"></div><div id="rotate">Turn your phone sideways to take the field.</div></section><footer><span>MOUSE · AIM YOUR STEP / SPACE · TAP THE COUNT</span><span>4-TO-5 MAX · EVERY TAP COUNTS</span></footer></main>`;
const overlay = $("overlay"),
  hud = $("hud");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1724);
scene.fog = new THREE.Fog(0x0a1724, 80, 210);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400),
  renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(
  Math.min(devicePixelRatio, matchMedia("(pointer:coarse)").matches ? 1 : 1.75),
);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
const pmrem = new THREE.PMREMGenerator(renderer),
  reflectionRoom = new RoomEnvironment();
const reflections = pmrem.fromScene(reflectionRoom);
scene.environment = reflections.texture;
scene.environmentIntensity = 0.7;
reflectionRoom.dispose();
pmrem.dispose();
$("scene").append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xcce9ff, 0x304234, 2));
const light = new THREE.DirectionalLight(0xffedcd, 3);
light.position.set(-30, 70, -30);
light.castShadow = true;
const shadowSize = matchMedia("(pointer:coarse)").matches ? 1024 : 2048;
light.shadow.mapSize.set(shadowSize, shadowSize);
Object.assign(light.shadow.camera, {
  left: -90,
  right: 90,
  top: 90,
  bottom: -90,
});
scene.add(light);
function box(
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
  );
  m.position.set(x, y, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
box(180, 0.3, 100, 0x214b43, 0, -0.3, 42);
for (let i = 0; i < 20; i++)
  box(8, 0.02, 85.33, i % 2 ? 0x28584c : 0x245246, -76 + i * 8, 0, 42.66);
for (let x = -80; x <= 80; x += 8) {
  box(0.1, 0.04, 85.33, 0xb7c9b4, x, 0.03, 42.66);
  for (const y of [32, 53.33]) box(1.1, 0.05, 0.16, 0xf1e6cc, x, 0.06, y);
}
for (const y of [0, 85.33]) box(160, 0.08, 0.15, 0xe1ddc0, 0, 0.04, y);
for (let tier = 0; tier < 5; tier++)
  box(175, 2, 5, 0x263c4e, 0, tier * 2, 98 + tier * 5);
type DetailedMarcher = Awaited<ReturnType<typeof loadCombinedMarcher>>;
const band: (DetailedMarcher | undefined)[] = new Array(
  selected.drill.performers.length,
);
let bandReady = false,
  bandError = false;
Promise.all(
  selected.drill.performers.map(async (_, id) => {
    const person = roster[id];
    const model = await loadCombinedMarcher(person.gender, person.height);
    band[id] = model;
    scene.add(model.group);
  }),
)
  .then(() => {
    bandReady = true;
    updateAssetStatus();
    if (mode === "lobby") lobby();
  })
  .catch((error) => {
    bandError = true;
    updateAssetStatus();
    console.error(error);
  });
function updateAssetStatus() {
  const status = document.getElementById("asset-status");
  if (status)
    status.textContent = bandError
      ? "The band could not load. Reload to retry."
      : bandReady
        ? "12 detailed marchers · 6 women / 6 men"
        : "Loading the detailed band…";
  const startButton = document.getElementById(
    "start",
  ) as HTMLButtonElement | null;
  if (startButton) startButton.disabled = !bandReady;
}
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.12, 0.2, 40),
  new THREE.MeshBasicMaterial({ color: 0xffd17c, side: THREE.DoubleSide }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.1;
scene.add(ring);
const upcomingRing = new THREE.Mesh(
  new THREE.RingGeometry(0.18, 0.25, 40),
  new THREE.MeshBasicMaterial({ color: 0x68dce5, side: THREE.DoubleSide }),
);
upcomingRing.rotation.x = -Math.PI / 2;
upcomingRing.visible = false;
scene.add(upcomingRing);
const headingArrow = new THREE.ArrowHelper(
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(),
  1.8,
  0xefc17a,
  0.55,
  0.32,
);
const previewArrow = new THREE.ArrowHelper(
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(),
  3,
  0x68dce5,
  0.7,
  0.4,
);
headingArrow.visible = false;
previewArrow.visible = false;
scene.add(headingArrow, previewArrow);
const playerMarker = new THREE.Mesh(
  new THREE.RingGeometry(0.42, 0.52, 32),
  new THREE.MeshBasicMaterial({ color: 0xffd17c, side: THREE.DoubleSide }),
);
playerMarker.rotation.x = -Math.PI / 2;
scene.add(playerMarker);
const map = $("map") as HTMLCanvasElement,
  ctx = map.getContext("2d")!;
function drawMap(actual: Dot[], dot: Dot) {
  ctx.fillStyle = "#102a2b";
  ctx.fillRect(0, 0, 310, 170);
  ctx.strokeStyle = "#52716a";
  for (let x = 10; x <= 300; x += 14.5) {
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x, 160);
    ctx.stroke();
  }
  const draw = (d: Dot, color: string, r: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(155 + d.x * 1.8, 160 - d.y * 1.75, r, 0, Math.PI * 2);
    ctx.fill();
  };
  actual.forEach((p, i) =>
    draw(p, i === playerId ? "#ffc76f" : "#9fcbd1", i === playerId ? 4 : 2),
  );
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.arc(155 + dot.x * 1.8, 160 - dot.y * 1.75, 6, 0, Math.PI * 2);
  ctx.stroke();
}
function notice(text: string) {
  $("notice").textContent = text;
  setTimeout(() => {
    if ($("notice").textContent === text) $("notice").textContent = "";
  }, 5000);
}
function status(text: string) {
  const el = document.getElementById("asset-status");
  if (el) el.textContent = text;
  else notice(text);
}
function getPlayback() {
  playback ??= new Playback();
  playback.gain.gain.value = muted ? 0 : 1;
  return playback;
}
function showOptions(host = false) {
  const progress = readProgress();
  return shows
    .map(
      (s) =>
        `<option value="${s.id}" ${s.id === selected.id ? "selected" : ""} ${!host && !progress.unlocked.includes(s.id) ? "disabled" : ""}>${s.name}${progress.unlocked.includes(s.id) ? "" : ` · unlock at ${tuning.unlock}`}</option>`,
    )
    .join("");
}
function difficultyOptions() {
  return difficulties
    .map((d) => `<option ${difficulty === d ? "selected" : ""}>${d}</option>`)
    .join("");
}
function settings() {
  return `<div class="settings"><label>SHOW<select id="show-choice">${showOptions()}</select></label><label>DIFFICULTY<select id="difficulty">${difficultyOptions()}</select></label></div>`;
}
function bindSettings(multiplayer = false) {
  const change = async () => {
    selected = shows.find(
      (s) => s.id === ($("show-choice") as HTMLSelectElement).value,
    )!;
    difficulty = ($("difficulty") as HTMLSelectElement).value as Difficulty;
    if (multiplayer)
      try {
        await room!.request("select", { show: selected.id, difficulty });
      } catch (e) {
        notice(String(e));
      }
    else updateBest();
  };
  $("show-choice").onchange = change;
  $("difficulty").onchange = change;
}
function updateBest() {
  const best = readProgress().best[`${selected.id}:${difficulty}`];
  const el = document.getElementById("personal-best");
  if (el)
    el.textContent =
      best === undefined
        ? "Your first performance awaits."
        : `Personal best · ${best.toFixed(1)} / 100`;
}
function menu() {
  mode = "menu";
  hud.hidden = true;
  overlay.hidden = false;
  getPlaybackIfExistsStop();
  overlay.innerHTML = `<div class="intro"><p class="eyebrow">A MARCHING FIELD GAME</p><h1>Every step.<br>Every interval.</h1><p><strong>Aim with the mouse. Tap Space on every moving count.</strong> Point at the field in the direction you want to step. Each Space press takes one step toward your aim; release and tap again for the next count. During holds, stop pressing; an early step stays in place and costs points.</p><small>The show starts with an eight-count HOLD after the count-in. Wait for MOVE before stepping.</small>${settings()}<small id="personal-best"></small><button class="primary" id="start">Take the field ↗</button><button id="tilt">Enable phone tilt</button><button id="calibrate">Calibrate timing</button><small id="asset-status"></small><details ${location.hash.startsWith("#room=") ? "open" : ""}><summary>March with friends · 2–4 players</summary><label>DISPLAY NAME<input id="name" maxlength="24" value="${esc(localStorage.getItem("mb-name") ?? "Marcher")}" autocomplete="nickname"></label><div class="room-entry"><button id="create">Create room</button><input id="code" aria-label="Room code" maxlength="6" placeholder="ROOM CODE" value="${esc(location.hash.replace("#room=", "").slice(0, 6))}"><button id="join">Join room</button></div><small>Compete on your own score. Make the band better together.</small></details><p class="review-links"><a href="/uniform.html">Uniform studio ↗</a> · <a href="/music.html">Music study ↗</a></p></div>`;
  bindSettings();
  updateBest();
  updateAssetStatus();
  $("start").onclick = () => void solo();
  $("tilt").onclick = () => void enableTilt();
  $("calibrate").onclick = () => void calibrate();
  for (const action of ["create", "join"] as const)
    $(action).onclick = () => void enterRoom(action);
}
function mobileReady() {
  if (
    matchMedia("(pointer:coarse)").matches &&
    (!controls.enabled || !controls.hasReading)
  )
    throw Error(
      "Enable phone tilt and hold the phone comfortably before starting.",
    );
}
function getPlaybackIfExistsStop() {
  playback?.stop();
}
async function enableTilt() {
  try {
    await controls.enable();
    status(
      "Tilt enabled. Hold comfortably in landscape, then Recenter before playing.",
    );
    const b = document.getElementById("tilt");
    if (b) b.textContent = "Recenter phone tilt";
  } catch (e) {
    status(String(e));
  }
}
async function solo() {
  if (!bandReady) return;
  try {
    mobileReady();
    mode = "loading";
    status("Preparing the brass…");
    await getPlayback().prepare(selected);
    playerId = 5;
    begin(Math.floor(Math.random() * 0xffffffff));
  } catch (e) {
    mode = "menu";
    status(String(e));
  }
}
function begin(seed: number, delay = 0, restore = false) {
  run = new PerformanceRun(selected, difficulty, playerId, seed);
  run.incomplete = restore;
  results.clear();
  remote.clear();
  bandSamples = [];
  lastBandBeat = 0;
  lastPage = -1;
  lastSend = 0;
  rejoinUntil = 0;
  roomInterrupted = false;
  returningControl = false;
  mode = "run";
  overlay.hidden = true;
  hud.hidden = false;
  controls.keys.clear();
  const stage = $("stage");
  stage.tabIndex = 0;
  stage.focus({ preventScroll: true });
  $("pause").hidden = !!room;
  $("rhythm").hidden = !matchMedia("(pointer:coarse)").matches;
  $("recenter").hidden = !controls.enabled;
  const p = getPlayback();
  p.start(selected, delay);
  if (restore && room?.room.run) {
    const elapsed =
      (Date.now() + room.offset - room.room.run.at) / 1000 -
      selected.tempo.seconds(8) -
      0.15;
    const count = selected.tempo.count(Math.max(0, elapsed));
    run.steps.push({
      synthetic: true,
      seconds: Math.max(0, elapsed),
      end: Math.max(0, elapsed) + 0.01,
      from: run.ai(count, playerId),
      to: run.ai(count, playerId),
      size: 0,
      page: selected.page(count),
      number: 0,
      timing: 0,
      direction: 0,
      sizeError: 0,
      hold: true,
      backward: false,
    });
    p.stop();
    p.show = selected;
    p.rejoin(Math.max(0, elapsed));
    rejoinUntil = p.resumeUntil;
    returningControl = true;
  }
}
function rhythm(override?: Steering, pressedSeconds?: number) {
  if (mode === "calibrate") {
    calTap();
    return;
  }
  if (
    mode !== "run" ||
    !run ||
    !playback ||
    playback.paused ||
    playback.countingIn ||
    playback.context.currentTime < rejoinUntil ||
    roomInterrupted
  )
    return;
  const input = override ?? controls.value;
  run.tap(
    pressedSeconds ?? playback.seconds,
    input,
    calibration,
    override ? "nudge" : "tilt",
  );
  if (run.steps.at(-1)?.hold) {
    warningAt = performance.now() / 1000;
    warningUntil = performance.now() + 2000;
    $("feedback").textContent = "Not yet";
  }
}
$("rhythm").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  rhythm();
});
$("recenter").onclick = () => controls.recenter();
$("view").onclick = () => {
  overhead = !overhead;
  $("view").textContent = overhead ? "Follow camera" : "Overhead";
};
$("sound").onclick = () => {
  muted = !muted;
  if (playback) playback.gain.gain.value = muted ? 0 : 1;
  $("sound").textContent = muted ? "Sound off" : "Sound on";
};
const mousePosition = new THREE.Vector2();
let mouseActive = false;
const aimRay = new THREE.Raycaster(),
  aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function mouseDirection() {
  if (!mouseActive || !run || !playback) return { x: 0, y: 0 };
  aimRay.setFromCamera(mousePosition, camera);
  const point = aimRay.ray.intersectPlane(aimPlane, new THREE.Vector3());
  if (!point) return { x: 0, y: 0 };
  const from = run.position(selected.tempo.count(playback.seconds));
  const x = point.x - from.x,
    y = point.z - from.y,
    length = Math.hypot(x, y);
  return length < 0.2 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}
$("stage").addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  const rect = renderer.domElement.getBoundingClientRect();
  mousePosition.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    (-(e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  mouseActive = true;
});
function pause() {
  if (mode !== "run" || room || !playback) return;
  controls.keys.clear();
  if (playback.paused) {
    playback.resume();
    $("pause").textContent = "Pause";
  } else {
    playback.pause();
    $("pause").textContent = "Resume";
  }
}
$("pause").onclick = pause;
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input,select,textarea")) return;
  if ([" ", "Escape"].includes(e.key)) e.preventDefault();
  if (e.repeat) return;
  if (e.key === " ") {
    if (mode === "calibrate") calTap();
    else {
      const aim = mouseDirection();
      rhythm({
        forward: Math.hypot(aim.x, aim.y) > 0 ? (aim.y > 0 ? -1 : 1) : 0,
        side: 0,
        aim,
      });
    }
  }
  if (e.key === "Escape") pause();
});
window.addEventListener("blur", () => {
  if (mode === "run" && !room && !playback?.paused) pause();
});
async function calibrate() {
  const p = getPlayback();
  await p.context.resume();
  p.stop();
  mode = "calibrate";
  calGaps = [];
  calLastBeat = -1;
  calStart = p.context.currentTime + 0.5;
  for (let i = 0; i < 20; i++) p.click(calStart + (i * 60) / 84, i % 4 === 0);
  overlay.innerHTML = `<div class="panel"><p class="eyebrow">DEVICE TIMING</p><h1>Find the pulse.</h1><p>Listen to four clicks, then tap with eight. Your timing adjustment stays on this device.</p><button class="primary" id="cal-tap">Tap · Space</button><p id="cal-status">Listen…</p><button id="cal-back">Back</button></div>`;
  $("cal-tap").onclick = calTap;
  $("cal-back").onclick = menu;
}
function calTap() {
  if (!playback) return;
  const elapsed = playback.context.currentTime - calStart,
    beat = Math.round(elapsed / (60 / 84));
  if (beat < 4) return;
  if (calGaps.length && beat === calLastBeat) return;
  calLastBeat = beat;
  calGaps.push(elapsed - (beat * 60) / 84);
  $("cal-status").textContent = `${calGaps.length} / 8 taps`;
  if (calGaps.length === 8) {
    const sorted = [...calGaps].sort((a, b) => a - b);
    calibration = (sorted[3] + sorted[4]) / 2;
    localStorage.setItem("mb-calibration", String(calibration));
    menu();
  }
}
async function enterRoom(action: "create" | "join") {
  const name = ($("name") as HTMLInputElement).value.trim();
  if (!name) {
    status("Enter a display name.");
    return;
  }
  localStorage.setItem("mb-name", name);
  try {
    status("Connecting to the room…");
    room = new RoomClient();
    bindRoom();
    await room.enter(
      action,
      name,
      ($("code") as HTMLInputElement).value.trim(),
    );
    lobby();
  } catch (e) {
    room = undefined;
    status(`${String(e)} · The room service must be running.`);
  }
}
function bindRoom() {
  room!.onnotice = (text) => {
    notice(text);
    if (
      run &&
      (text.startsWith("Room connection") ||
        (text.startsWith("Peer link lost") && !room?.isHost))
    ) {
      run.incomplete = true;
      roomInterrupted = true;
    }
  };
  room!.onpacket = (packet: Packet) => {
    if (packet.kind === "position") {
      remote.set(packet.id, {
        position: packet.position,
        count: packet.count,
        step: packet.step,
        at: performance.now(),
      });
    } else {
      results.set(packet.id, {
        result: packet.result,
        incomplete: packet.incomplete,
        band: packet.band ?? 0,
      });
      if (mode === "recap") renderResults();
    }
  };
  room!.onroom = () => {
    const r = room!;
    if (!r.room) return;
    selected = shows.find((s) => s.id === r.room.show) ?? shows[0];
    difficulty = r.room.difficulty;
    playerId = r.me?.slot ?? 5;
    if (r.me?.incomplete && run) run.incomplete = true;
    if (
      roomInterrupted &&
      r.me?.connected &&
      r.transportReady &&
      playback &&
      mode === "run"
    ) {
      roomInterrupted = false;
      returningControl = true;
      rejoinUntil =
        playback.context.currentTime +
        4 *
          (selected.tempo.seconds(
            Math.max(0, selected.tempo.count(playback.seconds)) + 1,
          ) -
            playback.seconds);
      notice("Reconnected · control returns after four counts");
    }
    if (r.room.run && r.room.run.id !== startedRun) {
      startedRun = r.room.run.id;
      mode = "loading";
      const launch = () =>
        void getPlayback()
          .prepare(selected)
          .then(() => {
            const delay = (r.room.run!.at - Date.now() - r.offset) / 1000;
            begin(r.room.run!.seed, Math.max(0, delay), delay < -0.5);
          })
          .catch((e) => notice(String(e)));
      if (
        Date.now() + r.offset > r.room.run.at + 500 &&
        playback?.context.state !== "running"
      ) {
        overlay.hidden = false;
        hud.hidden = true;
        overlay.innerHTML =
          '<div class="panel"><p class="eyebrow">YOUR ROOM IS STILL PLAYING</p><h1>Rejoin the band.</h1><p>AI is covering your spot. Rejoin after a count-in; this performance stays marked incomplete.</p><button class="primary" id="rejoin">Enable audio and rejoin</button></div>';
        $("rejoin").onclick = launch;
      } else launch();
    } else if (!r.room.run && mode !== "loading") lobby();
  };
}
function lobby() {
  if (!room) return;
  mode = "lobby";
  hud.hidden = true;
  overlay.hidden = false;
  playback?.stop();
  startedRun = "";
  const r = room,
    me = r.me;
  overlay.innerHTML = `<div class="panel lobby"><p class="eyebrow">MARCH TOGETHER / COMPETE INDIVIDUALLY</p><h1>Room ${esc(r.room.code)}</h1><div class="settings"><label>SHOW<select id="show-choice" ${r.isHost ? "" : "disabled"}>${showOptions()}</select></label><label>DIFFICULTY<select id="difficulty" ${r.isHost ? "" : "disabled"}>${difficultyOptions()}</select></label></div><ul class="members">${r.room.members.map((m) => `<li><span>${esc(m.name)} ${m.id === r.room.host ? "· host" : ""}</span><b>${!m.connected ? "Connecting" : m.ready ? "Ready" : "Not ready"}</b></li>`).join("")}</ul><p id="connection">${r.transportReady ? "Peer links connected." : "Connecting peer links…"} ${r.room.members.length} / 4 players</p><button id="ready" class="primary" ${!bandReady || !r.transportReady ? "disabled" : ""}>${me?.ready ? "Unready" : "Confirm Ready"}</button>${r.isHost ? `<button id="room-start" ${r.room.members.length < 2 || r.room.members.some((m) => !m.ready || !m.connected) ? "disabled" : ""}>Start count-in</button>` : ""}<button id="invite">Copy invite link</button><button id="room-tilt">${controls.enabled ? "Recenter tilt" : "Enable phone tilt"}</button><button id="leave">Leave room</button><small id="asset-status"></small></div>`;
  bindSettings(true);
  $("ready").onclick = async () => {
    try {
      mobileReady();
      await getPlayback().prepare(selected);
      await r.request("ready", { ready: !me?.ready });
    } catch (e) {
      notice(String(e));
    }
  };
  const start = document.getElementById("room-start");
  if (start)
    start.onclick = () =>
      void r.request("start").catch((e) => notice(String(e)));
  $("invite").onclick = () =>
    void navigator.clipboard
      .writeText(`${location.origin}/#room=${r.room.code}`)
      .then(() => notice("Invite link copied"))
      .catch(() => notice(`Room code: ${r.room.code}`));
  $("room-tilt").onclick = () =>
    controls.enabled ? controls.recenter() : void enableTilt();
  $("leave").onclick = () =>
    void r.leave().finally(() => {
      room = undefined;
      location.hash = "";
      menu();
    });
}
function finish() {
  if (!run) return;
  run.advance(112);
  playback?.stop();
  mode = "recap";
  hud.hidden = true;
  overlay.hidden = false;
  const result = run.results(),
    incomplete = run.incomplete || !!room?.me?.incomplete;
  recordResult(selected.id, difficulty, result.total, !incomplete);
  const bandScore = bandSamples.length
    ? bandSamples.reduce((a, b) => a + b, 0) / bandSamples.length
    : 0;
  const id = room?.id ?? "solo";
  results.set(id, { result, incomplete, band: bandScore });
  room?.send({ kind: "result", id, result, incomplete, band: bandScore });
  renderResults();
}
function renderResults() {
  if (!run) return;
  const own = run.results(),
    r = room;
  const entries = r
    ? r.room.members.map((m) => ({
        name: m.name,
        id: m.id,
        data: results.get(m.id),
        incomplete: m.incomplete,
      }))
    : [
        {
          name: "Your performance",
          id: "solo",
          data: results.get("solo"),
          incomplete: run.incomplete,
        },
      ];
  entries.sort(
    (a, b) =>
      (b.data && !b.data.incomplete ? b.data.result.total : -1) -
      (a.data && !a.data.incomplete ? a.data.result.total : -1),
  );
  const band = results.get(r?.room.host ?? "solo")?.band;
  overlay.innerHTML = `<div class="panel recap"><p class="eyebrow">${esc(selected.name)} / ${difficulty} / RESULTS</p><h1>${own.total.toFixed(1)}<small> / 100</small></h1><p>${run.incomplete ? "Incomplete performance · no record or unlock awarded." : "Your individual performance. Every step counted."}</p><div class="caption"><span>SHARED BAND SCORE · SEPARATE</span><b>${band === undefined ? "Waiting for host…" : band.toFixed(1)}</b></div>${entries.map((e, i) => `<div class="caption"><span>${i + 1}. ${esc(e.name)}</span><b>${e.data ? `${e.data.result.total.toFixed(1)}${e.data.incomplete ? " · incomplete" : ""}` : e.incomplete ? "Disconnected · incomplete" : "Finishing…"}</b></div>`).join("")}<div class="analytics">${[
    ["DOT", own.dot],
    ["FORM", own.form],
    ["TIMING", own.timing],
    ["STEP SIZE", own.stepSize],
    ["DIRECTION", own.direction],
  ]
    .map(
      ([name, value]) =>
        `<div><span>${name}</span><b>${Number(value).toFixed(1)}</b></div>`,
    )
    .join(
      "",
    )}</div><p>${own.misses} missed counts · ${own.extra} extra steps · ${own.faults} hold faults<br>Average step ${own.averageStep.toFixed(1)} in · largest ${own.maxStep.toFixed(1)} in<br>Technique deduction ${own.technique.toFixed(1)} points · DOT/FORM 50/50</p><details><summary>Inspect every set</summary><div class="table-wrap"><table><thead><tr><th>Set</th><th>DOT</th><th>FORM</th><th>Timing</th><th>Size</th><th>Direction</th><th>Off dot</th><th>Faults</th></tr></thead><tbody>${own.sets.map((s, i) => `<tr><th>${i + 1}. ${esc(s.name)}</th><td>${s.dot.toFixed(0)}</td><td>${s.form.toFixed(0)}</td><td>${s.timing.toFixed(0)}</td><td>${s.stepSize.toFixed(0)}</td><td>${s.direction.toFixed(0)}</td><td>${s.distance.toFixed(1)} in<small>${s.discount.toFixed(1)} in discounted for form</small></td><td>${s.misses} missed / ${s.extra} extra / ${s.faults} hold</td></tr>`).join("")}</tbody></table></div></details><p>${readProgress().unlocked.includes("reprise") ? "Sunrise / Reprise unlocked." : `Reach ${tuning.unlock} individual points to unlock Sunrise / Reprise.`}</p>${r ? `${r.isHost ? '<button class="primary" id="room-again">Return room to lobby</button>' : "<p>Waiting for the host to return to the lobby.</p>"}<button id="exit-results">Leave room</button>` : '<button class="primary" id="again">Full-show retry ↗</button><button id="home">Choose show</button>'}</div>`;
  if (r) {
    const again = document.getElementById("room-again");
    if (again)
      again.onclick = () =>
        void r.request("lobby").catch((e) => notice(String(e)));
    $("exit-results").onclick = () =>
      void r.leave().finally(() => {
        room = undefined;
        menu();
      });
  } else {
    $("again").onclick = () => void solo();
    $("home").onclick = menu;
  }
}
function resize() {
  const stage = $("stage");
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
const nameLabels = new Map<string, HTMLElement>();
function drawNames(positions: Dot[]) {
  const members = room?.room?.members ?? [];
  for (const [id, label] of nameLabels)
    if (!members.some((m) => m.id === id)) {
      label.remove();
      nameLabels.delete(id);
    }
  for (const m of members) {
    let label = nameLabels.get(m.id);
    if (!label) {
      label = document.createElement("span");
      label.className = "name-label";
      $("labels").append(label);
      nameLabels.set(m.id, label);
    }
    label.textContent = m.name + (m.connected ? "" : " · AI");
    const p = positions[m.slot],
      point = new THREE.Vector3(p.x, 4.7, p.y).project(camera);
    label.style.left = `${(point.x + 1) * 0.5 * $("stage").clientWidth}px`;
    label.style.top = `${(1 - point.y) * 0.5 * $("stage").clientHeight}px`;
    label.hidden = mode !== "run" || point.z > 1;
  }
}
function warning(text: string) {
  if (performance.now() / 1000 - warningAt < 5) return;
  warningAt = performance.now() / 1000;
  warningUntil = performance.now() + 2200;
  $("feedback").textContent = text;
}
function frame() {
  requestAnimationFrame(frame);
  if (fieldStyle !== selected.id) {
    fieldStyle = selected.id;
    const reprise = selected.id === "reprise";
    scene.background = new THREE.Color(reprise ? 0x15162c : 0x0a1724);
    (scene.fog as THREE.Fog).color.copy(scene.background);
    light.color.setHex(reprise ? 0xe2d8ff : 0xffedcd);
    renderer.toneMappingExposure = reprise ? 0.8 : 0.95;
  }
  let count = 0,
    positions = selected.drill.initial;
  upcomingRing.visible = false;
  headingArrow.visible = false;
  previewArrow.visible = false;
  $("move-preview").hidden = true;
  if (mode === "run" && run && playback) {
    count = Math.min(112, selected.tempo.count(playback.seconds));
    if (count >= 0 && !playback.paused && !playback.countingIn)
      run.advance(count);
    if (room?.room) {
      for (const m of room.room.members) {
        if (m.id === room.id) continue;
        const packet = remote.get(m.id);
        if (m.connected && packet && performance.now() - packet.at < 2500)
          run.remote.set(m.slot, packet.position);
        else run.remote.delete(m.slot);
      }
    }
    positions = run.actual(Math.max(0, count));
    if (roomInterrupted || returningControl) {
      const ai = run.ai(Math.max(0, count), playerId);
      positions[playerId] = ai;
      if (returningControl && playback.context.currentTime >= rejoinUntil) {
        returningControl = false;
        const sec = playback.seconds;
        run.steps.push({
          synthetic: true,
          seconds: sec,
          end: sec + 0.01,
          from: ai,
          to: ai,
          size: 0,
          page: selected.page(count),
          number: run.steps.length,
          timing: 0,
          direction: 0,
          sizeError: 0,
          hold: false,
          backward: false,
        });
        notice("Your control has resumed · result remains incomplete");
      }
    }
    if (room && performance.now() - lastSend > 80) {
      lastSend = performance.now();
      room.send({
        kind: "position",
        id: room.id,
        count,
        position: positions[playerId],
        step: run.steps.at(-1),
      });
    }
    const page = selected.page(count),
      goal = selected.goal(count)[playerId];
    const movingPhase =
      count >= 0 &&
      !playback.countingIn &&
      !playback.paused &&
      !selected.hold(count);
    $("motion-state").hidden = !movingPhase;
    $("motion-state").textContent = controls.enabled
      ? "TILT TO STEER · TAP STEP ON THE COUNT"
      : "AIM WITH MOUSE · TAP SPACE ON THE COUNT";
    const countIn = playback.countingIn ? playback.countoffProgress : undefined;
    const beats = countDisplay(count, countIn),
      moves = moveDisplay(selected, count, countIn);
    $("page").textContent =
      `${selected.name.toUpperCase()} · SET ${moves.page + 1} / ${selected.drill.pages.length}`;
    $("current-move").textContent = moves.now.label;
    $("current-detail").textContent = moves.now.name;
    $("next-move").textContent = moves.next?.label ?? "FINISH";
    $("next-detail").textContent = moves.next?.name ?? "Final release";
    $("counts-left").textContent = `${moves.remaining} LEFT`;
    Array.from($("set-progress").children).forEach((tick, index) => {
      tick.classList.toggle("complete", index < moves.progress);
      tick.classList.toggle("current", index === moves.progress);
    });
    $("count-label").textContent = playback.paused
      ? "PAUSED"
      : returningControl
        ? "REJOIN COUNT-IN"
        : beats.caption;
    $("count-position").textContent = beats.position;
    Array.from($("beat").children).forEach((tile, index) => {
      tile.textContent = beats.labels[index];
      tile.classList.toggle("active", index === beats.active);
      if (index === beats.active) tile.setAttribute("aria-current", "step");
      else tile.removeAttribute("aria-current");
    });
    if (page !== lastPage && count >= 0 && !playback.countingIn) {
      lastPage = page;
      const keepNotYet =
        selected.hold(count) &&
        $("feedback").textContent === "Not yet" &&
        performance.now() < warningUntil;
      if (!keepNotYet) {
        warningUntil = performance.now() + 1800;
        $("feedback").textContent = selected.hold(count) ? "HOLD" : "MOVE";
      }
    }
    if (performance.now() > warningUntil) $("feedback").textContent = "";
    if (
      !selected.hold(count) &&
      distance(
        positions[playerId],
        selected.target(Math.max(0, count))[playerId],
      ) > 2.5
    )
      warning("Recover toward your dot");
    if (
      run.steps.at(-1)?.hold &&
      performance.now() > warningUntil &&
      selected.hold(count)
    )
      warning("Not yet");
    if (Math.floor(count) > lastBandBeat) {
      lastBandBeat = Math.floor(count);
      const ideal = selected.target(count);
      const visual = positions.map((p, i) => {
        const m = formMetrics(p, positions, ideal, i);
        return (
          50 * Math.exp(-(m.raw - 0.5 * m.eligible) / 0.85) +
          25 * Math.exp(-m.spacing / 0.85) +
          25 * Math.exp(-m.shape / 0.85)
        );
      });
      bandSamples.push(visual.reduce((a, b) => a + b, 0) / visual.length);
    }
    const preview = !playback.countingIn
      ? nextMovePreview(selected, count, playerId)
      : null;
    if (preview) {
      upcomingRing.visible = true;
      upcomingRing.position.set(preview.dot.x, 0.13, preview.dot.y);
      upcomingRing.scale.setScalar(1 + 0.12 * Math.sin(count * Math.PI * 2));
      $("move-preview").hidden = false;
      $("preview-count").textContent = `MOVE IN ${preview.countdown}`;
      $("preview-name").textContent = preview.name;
      const direction = new THREE.Vector3(
        preview.dot.x - positions[playerId].x,
        0,
        preview.dot.y - positions[playerId].y,
      );
      const length = direction.length();
      if (length > 0.05) {
        previewArrow.visible = true;
        previewArrow.position.set(
          positions[playerId].x,
          0.18,
          positions[playerId].y,
        );
        previewArrow.setDirection(direction.normalize());
        previewArrow.setLength(
          Math.min(3, length),
          Math.min(0.7, length * 0.3),
          Math.min(0.4, length * 0.2),
        );
      }
    }
    if (!playback.countingIn) {
      const direction = mouseActive ? mouseDirection() : run.heading(count);
      if (Math.hypot(direction.x, direction.y) > 0.01) {
        headingArrow.visible = true;
        headingArrow.position.set(
          positions[playerId].x,
          0.16,
          positions[playerId].y,
        );
        headingArrow.setDirection(
          new THREE.Vector3(direction.x, 0, direction.y),
        );
      }
    }
    ring.position.set(goal.x, 0.1, goal.y);
    drawMap(positions, goal);
    conduct(
      $("conductor") as HTMLCanvasElement,
      playback.countingIn ? Math.max(0, playback.countoffProgress) : count,
    );
    if (count >= 112) finish();
  }
  const c = Math.max(0, count),
    page = selected.page(c),
    preparation =
      mode === "run" && !playback?.paused && !playback?.countingIn && c < 104
        ? stepOffPreparation(c, selected.hold(c), selected.hold((page + 1) * 8))
        : 0,
    closure = haltClosure(
      c,
      selected.hold(c),
      selected.hold(Math.max(0, page * 8 - 0.001)),
    );
  band.forEach((model, i) => {
    if (!model) return;
    model.group.position.set(positions[i].x, 0, positions[i].y);
    const member = room?.room?.members.find((m) => m.slot === i),
      remoteStep = member ? remote.get(member.id)?.step : undefined;
    const step = i === playerId ? run?.steps.at(-1) : remoteStep;
    if (preparation > 0) {
      const from = selected.drill.pages[page].dots[i],
        next = selected.drill.pages[page + 1].dots[i];
      model.animate(
        0,
        true,
        next.y > from.y,
        (next.x - from.x) / 8,
        (next.y - from.y) / 8,
        1,
        preparation,
      );
    } else if (
      mode === "run" &&
      step &&
      (i === playerId || member?.connected)
    ) {
      const pose = stepAnimation(
        step,
        selected.tempo.seconds(c),
        selected.hold(c),
      );
      model.animate(
        pose.count,
        pose.hold,
        pose.backward,
        pose.dx,
        pose.dz,
        closure,
      );
    } else {
      const prev = page
          ? selected.drill.pages[page - 1].dots[i]
          : selected.drill.initial[i],
        goal = selected.drill.pages[page].dots[i];
      model.animate(
        closure < 1 ? page * 8 : c,
        mode !== "run" ||
          count < 0 ||
          selected.hold(c) ||
          i === playerId ||
          !!playback?.paused ||
          !!playback?.countingIn,
        goal.y > prev.y,
        closure < 1 && page > 0
          ? (prev.x -
              (page > 1
                ? selected.drill.pages[page - 2].dots[i]
                : selected.drill.initial[i]
              ).x) /
              8
          : (goal.x - prev.x) / 8,
        closure < 1 && page > 0
          ? (prev.y -
              (page > 1
                ? selected.drill.pages[page - 2].dots[i]
                : selected.drill.initial[i]
              ).y) /
              8
          : (goal.y - prev.y) / 8,
        closure,
      );
    }
    if (mode === "run") {
      const offset = haltBodyOffset(
        c,
        selected.hold(c),
        c < 104 ? selected.hold((page + 1) * 8) : true,
        closure,
      );
      if (offset > 0) {
        const arrivalPage = selected.hold(c) ? page - 1 : page;
        if (arrivalPage >= 0) {
          const end = selected.drill.pages[arrivalPage].dots[i];
          const start =
            arrivalPage > 0
              ? selected.drill.pages[arrivalPage - 1].dots[i]
              : selected.drill.initial[i];
          const dx =
            step && !step.hold
              ? step.to.x - step.from.x
              : (end.x - start.x) / 8;
          const dz =
            step && !step.hold
              ? step.to.y - step.from.y
              : (end.y - start.y) / 8;
          // Keep the last leading foot on the arrival coordinate while the body closes over it.
          model.group.position.x -= dx * offset;
          model.group.position.z -= dz * offset;
        }
      }
    }
  });
  const player = positions[playerId];
  playerMarker.position.set(player.x, 0.1, player.y);
  ring.visible = mode === "run";
  playerMarker.visible = mode === "run";
  camera.position.lerp(
    overhead
      ? new THREE.Vector3(player.x, 65, player.y - 1)
      : new THREE.Vector3(player.x + 9, 13, player.y + 21),
    0.07,
  );
  camera.lookAt(player.x, 1, overhead ? player.y : player.y - 8);
  renderer.render(scene, camera);
  drawNames(positions);
  if (upcomingRing.visible) {
    const to = new THREE.Vector3(
      upcomingRing.position.x,
      0.2,
      upcomingRing.position.z,
    ).project(camera);
    const from = new THREE.Vector3(player.x, 0.2, player.y).project(camera);
    const angle =
      (Math.atan2(
        -(to.y - from.y) * $("stage").clientHeight,
        (to.x - from.x) * $("stage").clientWidth,
      ) *
        180) /
        Math.PI +
      90;
    $("preview-arrow").style.transform = `rotate(${angle}deg)`;
  }
}
menu();
frame();
const saved = new RoomClient();
saved.onnotice = notice;
void saved.restore().then((restored) => {
  if (restored) {
    room = saved;
    bindRoom();
    room.onroom();
  }
});
