# On the Dot — step 0

A keyboard-only, solo marching prototype rebuilt from architecture §13. Static Vite + TypeScript + Three.js; native Web Audio supplies the master clock. No downloaded art, audio, fonts or models.

## Run

```sh
npm ci
npm run dev
```

Open the printed localhost URL in a landscape desktop browser. Click **Calibrate timing** to save the median tap offset on this device, or **Take the field** to begin. Listen to the synthesized **5 … 6 … 5, 6, 7, 8** count-off.

- **Left / right:** on-beat path-relative steering. Misses are wasted; early nudges affect that count and late nudges affect the next.
- **Tab:** dot book with destination, step size and live path error in inches.
- **Escape:** pause / resume, including the audio-clock timeline.
- Holds: stand still; steering incurs a fault.

Gold is your marcher, the gold ring is your destination, and the top-right map shows the full field. Ten 8-count pages at 112 BPM include line, arc, holds, backward marching and a block. Finish for the recap and another rep with a new recorded seed.

## Verify

```sh
npm test
npm run build
```

Tests cover tempo conversion and changing beat maps/meters, timing windows, calibration, drill-sheet round trips, show validation (including continuous path crossings), seeded drift, holds, nudge scheduling, frame-independent simulation and live form alignment.

## Modules

- `tempo.ts`: tempo map, beat windows, calibration.
- `drill.ts`: quarter-step coordinate translator and show checker.
- `show.ts`: original 12-performer, 80-count drill.
- `game.ts`: deterministic movement, drift, judging and scores.
- `marcher.ts`: replaceable procedural marcher model.
- `main.ts`: keyboard input adapter, Web Audio scheduling, Three.js view and screens.

## Scope and remaining work

This is step **0**, not the Game Week finished product. No multiplayer, phone input, hazards, recorded/generated repertoire, crowd or voices yet. The simple procedural uniforms and field are the slice's presentation; the detailed style pass remains step 2. FORM estimates the local live form from four neighboring performers' displacement, rather than full line/arc/block regression. Calibration estimates phase within one beat; it cannot identify whole-beat device delays.

**The §13 no-steering tuning issue is intentionally retained for step 1.** Automatic dot pull remains forgiving and computer drift modest. Do not infer that high idle scores mean tuning is complete. No Locked architecture decision was changed.
