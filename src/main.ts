import * as THREE from "three";
import "./style.css";
import { show } from "./show";
import { checkShow, distance, formatDot, parseDot, type Dot } from "./drill";
import { Run, tempo, target, drift, PLAYER } from "./game";
import { calibrationOffset } from "./tempo";
import { marcher } from "./marcher";
const errors = checkShow(show);
if (errors.length) throw Error(errors.join("\n"));
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<main><header><a class="brand" href="#">ON THE DOT<span>FIELD NOTES / 001</span></a><span class="edition">FIRST REHEARSAL · SOLO SLICE</span><button id="sound" aria-label="Toggle click sound">Sound on</button></header><section id="stage"><div id="scene"></div><div id="hud" hidden><div class="score"><label>DOT <b id="dot">100.0</b></label><label>FORM <b id="form">100.0</b></label></div><div id="page"></div><div id="beat"></div><div id="feedback" role="status"></div><canvas id="map" width="310" height="170" aria-label="Full field map: gold player, white dot, blue band"></canvas><div id="book" hidden></div><button id="pause">Pause · Esc</button></div><div id="overlay"></div></section><footer><span>← → STEER ON THE COUNT</span><span>TAB · DOT BOOK</span><span>112 BPM / 12 BRASS / 80 COUNTS</span></footer></main>`;
const $ = (id: string) => document.getElementById(id)!;
const overlay = $("overlay"),
  hud = $("hud");
let audio: AudioContext;
let start = 0,
  mode: "menu" | "calibrate" | "run" | "recap" = "menu",
  run: Run,
  offset = Number(localStorage.getItem("mb-calibration") ?? 0),
  muted = false,
  paused = false,
  pauseTime = 0,
  nextClick = -8,
  lastCount = -8,
  calStart = 0,
  calClicks = 0;
let gaps: number[] = [];
let lastTapBeat = -1;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1724);
scene.fog = new THREE.Fog(0x0a1724, 80, 210);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400),
  renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
$("scene").append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xcce9ff, 0x304234, 2));
const light = new THREE.DirectionalLight(0xffedcd, 3);
light.position.set(-30, 70, -30);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
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
const band = Array.from({ length: 12 }, (_, id) => {
  const m = marcher(id === PLAYER);
  scene.add(m.group);
  return m;
});
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.65, 0.8, 40),
  new THREE.MeshBasicMaterial({ color: 0xffd17c, side: THREE.DoubleSide }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.1;
scene.add(ring);
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
    draw(p, i === PLAYER ? "#ffc76f" : "#9fcbd1", i === PLAYER ? 4 : 2),
  );
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.arc(155 + dot.x * 1.8, 160 - dot.y * 1.75, 6, 0, Math.PI * 2);
  ctx.stroke();
}
function initAudio() {
  audio ??= new AudioContext();
  void audio.resume();
}
function click(when: number, strong = false) {
  if (muted) return;
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.frequency.value = strong ? 1100 : 740;
  g.gain.setValueAtTime(0.12, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.045);
  o.connect(g).connect(audio.destination);
  o.start(when);
  o.stop(when + 0.05);
}
function menu() {
  mode = "menu";
  hud.hidden = true;
  overlay.hidden = false;
  overlay.innerHTML = `<div class="intro"><p class="eyebrow">A MARCHING FIELD EXPERIMENT</p><h1>Find your dot.<br>Feel the line.</h1><p>You march automatically, with a slight tendency to drift. Nudge <strong>← / → on the click</strong> to bend your path. Gold is you; the ring is your dot. Balance your written dot against a drifting band.</p><div class="instructions"><span>01 &nbsp; Listen to the count-off</span><span>02 &nbsp; Steer relative to your path</span><span>03 &nbsp; Stand still on holds</span></div><button class="primary" id="start">Take the field <span>↗</span></button><button id="calibrate">Calibrate timing</button><a href="/uniform.html" style="display:block;margin-top:14px;color:#efc17a">Review the detailed character ↗</a><small id="calinfo">Calibration saved on this device · ${Math.round(offset * 1000)} ms</small><details><summary>Drill-sheet translator</summary><input id="drill" aria-label="Drill sheet coordinates" value="2 outside S1 40, 3 behind FH"><button id="translate">Translate & check</button><output id="translated"></output></details></div><div class="stamp">L1<span>THE FIRST<br>EIGHT COUNTS</span></div>`;
  $("start").onclick = () => startRun();
  $("calibrate").onclick = calibrate;
  $("translate").onclick = () => {
    try {
      const d = parseDot(($("drill") as HTMLInputElement).value);
      $("translated").textContent =
        `x ${d.x}, y ${d.y} steps → ${formatDot(d)}`;
    } catch (e) {
      $("translated").textContent = String(e);
    }
  };
}
function startRun(seed = Math.floor(Math.random() * 100000)) {
  initAudio();
  run = new Run(seed);
  start = audio.currentTime + 0.15 + tempo.seconds(8);
  nextClick = -8;
  lastCount = -8;
  paused = false;
  $("feedback").textContent = "";
  mode = "run";
  overlay.hidden = true;
  hud.hidden = false;
  $("book").hidden = true;
  $("pause").textContent = "Pause · Esc";
}
function calibrate() {
  initAudio();
  mode = "calibrate";
  gaps = [];
  lastTapBeat = -1;
  calClicks = 0;
  calStart = audio.currentTime + 0.5;
  overlay.innerHTML = `<div class="panel"><p class="eyebrow">DEVICE TIMING</p><h1>Tap with the click.</h1><p>Listen for four counts, then tap Space on eight clicks. Wired headphones work best; large Bluetooth delays can be ambiguous.</p><div id="calbeat">Listen…</div><button id="tap" class="primary">Tap · Space</button><p id="calstatus">0 / 8 taps</p><button id="cancel">Back</button></div>`;
  $("tap").onclick = tap;
  $("cancel").onclick = menu;
}
function tap() {
  if (mode !== "calibrate" || audio.currentTime < calStart + tempo.seconds(4))
    return;
  const beat = Math.round((audio.currentTime - calStart) / (60 / 112));
  const gap = audio.currentTime - calStart - (beat * 60) / 112;
  if (beat === lastTapBeat) return;
  lastTapBeat = beat;
  gaps.push(gap);
  $("calstatus").textContent = `${gaps.length} / 8 taps`;
  if (gaps.length === 8) {
    offset = calibrationOffset(gaps);
    localStorage.setItem("mb-calibration", String(offset));
    menu();
  }
}
function recap() {
  mode = "recap";
  hud.hidden = true;
  overlay.hidden = false;
  const s = run.scores();
  overlay.innerHTML = `<div class="panel recap"><p class="eyebrow">REHEARSAL RECAP · SEED ${run.seed}</p><h1>${s.total.toFixed(2)}<small> / 100</small></h1><p>One rep in the books.</p><div class="caption"><span>VISUAL · DOT</span><b>${s.dot.toFixed(2)}</b></div><div class="caption"><span>VISUAL · FORM</span><b>${s.form.toFixed(2)}</b></div><div class="caption"><span>MUSIC · TIMING</span><b>${s.timing.toFixed(2)}</b></div><div class="caption"><span>BAND PERFORMANCE</span><b>${s.band.toFixed(2)}</b></div><p>${run.grades.length} nudges · ${run.faults} hold faults<br>Visual: dot / form equally · timing modifier · band 5%</p><button id="same" class="primary">Replay same seed ↗</button><button id="again">New band drift</button><button id="home">Back to field notes</button></div>`;
  $("same").onclick = () => startRun(run.seed);
  $("again").onclick = () => startRun();
  $("home").onclick = menu;
}
function togglePause() {
  if (mode !== "run") return;
  if (!paused) {
    pauseTime = audio.currentTime;
    paused = true;
    $("feedback").textContent = "Paused";
  } else {
    start += audio.currentTime - pauseTime;
    paused = false;
    $("feedback").textContent = "";
  }
  $("pause").textContent = paused ? "Resume · Esc" : "Pause · Esc";
}
$("pause").onclick = togglePause;
$("sound").onclick = () => {
  muted = !muted;
  $("sound").textContent = muted ? "Sound off" : "Sound on";
};
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).tagName === "INPUT") return;
  if (["ArrowLeft", "ArrowRight", "Tab", " ", "Escape"].includes(e.key))
    e.preventDefault();
  if (e.repeat) return;
  if (mode === "calibrate" && e.key === " ") tap();
  if (mode !== "run") return;
  if (e.key === "Escape") togglePause();
  if (e.key === "Tab") $("book").hidden = !$("book").hidden;
  if (!paused && (e.key === "ArrowLeft" || e.key === "ArrowRight"))
    $("feedback").textContent = run.nudge(
      e.key === "ArrowLeft" ? -1 : 1,
      audio.currentTime - start - offset,
    );
});
function resize() {
  const s = $("stage");
  renderer.setSize(s.clientWidth, s.clientHeight);
  camera.aspect = s.clientWidth / s.clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
let cameraBack = 0;
function frame() {
  requestAnimationFrame(frame);
  let count = 0;
  let positions = show.initial;
  if (mode === "calibrate") {
    while (calStart + (calClicks * 60) / 112 < audio.currentTime + 0.08) {
      click(calStart + (calClicks * 60) / 112, calClicks % 4 === 0);
      calClicks++;
    }
    $("calbeat").textContent = String(
      (Math.max(0, Math.floor((audio.currentTime - calStart) / (60 / 112))) %
        4) +
        1,
    );
  }
  if (mode === "run") {
    const seconds = (paused ? pauseTime : audio.currentTime) - start;
    count = tempo.count(seconds);
    if (!paused)
      while (
        nextClick <= 80 &&
        tempo.seconds(nextClick) + start < audio.currentTime + 0.08
      ) {
        if (nextClick >= 0 || [-8, -6, -4, -3, -2, -1].includes(nextClick))
          click(
            Math.max(audio.currentTime, tempo.seconds(nextClick) + start),
            nextClick % 4 === 0,
          );
        nextClick++;
      }
    if (count >= 80) {
      run.position(80);
      recap();
      count = 80;
    }
    positions = Array.from({ length: 12 }, (_, id) =>
      id === PLAYER
        ? run.position(count)
        : drift(Math.max(0, count), id, run.seed),
    );
    const page = Math.min(9, Math.floor(Math.max(0, count) / 8)),
      p = show.pages[page],
      goal = p.dots[PLAYER],
      s = run.scores();
    $("dot").textContent = s.dot.toFixed(1);
    $("form").textContent = s.form.toFixed(1);
    $("page").textContent = `PAGE ${page + 1} / 10 · ${p.name.toUpperCase()}`;
    $("beat").textContent =
      count < 0
        ? ({ [-8]: "5", [-6]: "6", [-4]: "5", [-3]: "6", [-2]: "7", [-1]: "8" }[
            Math.floor(count)
          ] ?? "·")
        : String(tempo.counter(count));
    $("book").textContent =
      `Page ${page + 1} · ${formatDot(goal)} · ${run.isHold(count) ? "HOLD 8" : `${(8 / (distance(page ? show.pages[page - 1].dots[PLAYER] : show.initial[PLAYER], goal) / 8)).toFixed(1)} to 5`} · ${Math.round(distance(positions[PLAYER], target(Math.max(0, count), PLAYER)) * 22.5)} inches off path`;
    if (Math.floor(count) !== lastCount) {
      lastCount = Math.floor(count);
      if (count >= 0 && lastCount % 8 === 0)
        $("feedback").textContent = run.isHold(count)
          ? "Hold · no steering"
          : p.name;
    }
    ring.position.set(goal.x, 0.1, goal.y);
    drawMap(positions, goal);
  }
  const c = Math.max(0, count),
    page = Math.min(9, Math.floor(c / 8));
  const before = page
    ? show.pages[page - 1].dots[PLAYER]
    : show.initial[PLAYER];
  const backwards = show.pages[page].dots[PLAYER].y > before.y;
  const hold = mode === "run" && run.isHold(c);
  band.forEach((m, i) => {
    m.group.position.set(positions[i].x, 0, positions[i].y);
    m.animate(c, mode !== "run" || count < 0 || hold, backwards);
  });
  const player = positions[PLAYER];
  cameraBack += (Number(backwards && mode === "run") - cameraBack) * 0.035;
  camera.position.lerp(
    new THREE.Vector3(player.x + 12, 17, player.y - 23 + cameraBack * 46),
    0.045,
  );
  camera.lookAt(player.x, 0, player.y + 7 - cameraBack * 14);
  renderer.render(scene, camera);
}
menu();
frame();
