# On the Dot — step 1 playtest

A keyboard-only, solo marching prototype rebuilt from architecture §13. Static Vite + TypeScript + Three.js; native Web Audio supplies the master clock. Original generated character and instrument assets; no stock art, audio, fonts or models.

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

The gold marker identifies your marcher, the gold ring is your destination, and the top-right map shows the full field. Ten 8-count pages at 112 BPM include line, arc, holds, backward marching and a block. Finish for the recap. **Replay same seed** keeps the same band drift and marching tendency so you can compare an idle rep with a steered rep; **New band drift** rolls fresh luck.

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
- `rigged-marcher.ts`: shared original character assets and count-driven skeletal pose.
- `hand-grip.ts`: glove deformation for the simplified woman hand rig.
- `baritone.ts`: original silver-plated instrument and grip targets.
- `main.ts`: keyboard input adapter, Web Audio scheduling, Three.js view and screens.

## Scope and remaining work

This is the step **1** steering playtest, not the Game Week finished product. No multiplayer, phone input, hazards, recorded/generated repertoire, crowd or voices yet. Detailed white-uniform characters and instruments are integrated; the wider field presentation remains step 2. FORM estimates the local live form from four neighboring performers' displacement, rather than full line/arc/block regression. Calibration estimates phase within one beat; it cannot identify whole-beat device delays.

**Step 1:** reduced dot pull, seeded spatial marching tendency, stronger coherent band drift and bounded on-beat steering make correction useful. Holds plant all marchers. Visual scoring splits DOT/FORM equally; timing modifies it rather than awarding idle bonus points. A 24-seed reference-controller comparison checks active steering beats idle; this is not a substitute for a human playtest. Full shape-aware FORM scoring and the visible podium drum major are documented follow-ups, not included visuals in this checkpoint. No Locked architecture decision was changed.

## Detailed character review (November 3)

Open `/uniform.html` on the local dev server to inspect the original woman and man
characters, baritone, playing pose and forward/backward motion. The playable band
now uses six women and six men, sharing geometry and textures with independent
skeletons. Hand posing remains an approximation: the woman export lacks individual
finger joints, so a grip shape curls its open glove; the man uses finger joints.
Neither model animates individual valve presses. Asset provenance and remaining
work: `docs/art/character-pipeline.md`.

GitLab CI runs type/unused-code checks, tests, production build and dependency
audit on branch and merge-request pipelines, retaining `dist/` for review.
No hosting deployment is configured by this checkpoint.
