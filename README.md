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
- `combined-marcher.ts`: shared complete playing-pose assets with independent leg rigs.
- `combined-skin.ts`: leg weights that leave the complete upper body fixed.
- `main.ts`: keyboard input adapter, Web Audio scheduling, Three.js view and screens.

## Scope and remaining work

This is the step **1** steering playtest, not the Game Week finished product. No multiplayer, phone input, hazards, recorded/generated repertoire, crowd or voices yet. Detailed white-uniform characters and instruments are integrated; the wider field presentation remains step 2. FORM estimates the local live form from four neighboring performers' displacement, rather than full line/arc/block regression. Calibration estimates phase within one beat; it cannot identify whole-beat device delays.

**Step 1:** reduced dot pull, seeded spatial marching tendency, stronger coherent band drift and bounded on-beat steering make correction useful. Holds plant all marchers. Visual scoring splits DOT/FORM equally; timing modifies it rather than awarding idle bonus points. A 24-seed reference-controller comparison checks active steering beats idle; this is not a substitute for a human playtest. Full shape-aware FORM scoring and the visible podium drum major are documented follow-ups, not included visuals in this checkpoint. No Locked architecture decision was changed.

## Detailed character review (November 3)

The playable band now uses **combined character-and-baritone sculpts** for all
12 marchers: six women and six men. Arms, hands and instruments stay rigid;
a separate original seven-bone lower-body rig provides count-driven steps,
forward foot roll, backward marching and planted holds. Geometry and textures
are shared by gender while each marcher owns its leg skeleton.

Open `/uniform.html` to inspect either model and preview forward/backward steps.
Asset provenance and remaining work: `docs/art/character-pipeline.md`.

GitLab CI runs type/unused-code checks, tests, production build and dependency
audit on branch and merge-request pipelines, retaining `dist/` for review.
No hosting deployment is configured by this checkpoint.

## Gameplay design review

The question queue is `docs/design-review-questions.md`. Discuss one question at a time before changing the input/scoring contract.
