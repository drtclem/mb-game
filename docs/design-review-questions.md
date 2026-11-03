# Gameplay design review — November 3, 2026

Discuss these with Taylor **one question at a time**. This is a queue, not a batch questionnaire or a set of newly locked decisions. Record each answer here and update the architecture/spec and implementation tasks before building the corresponding change. Do not ask Taylor to repeat decisions already documented.

## Sources reviewed

- `Game_Week_Assignment.pdf` (all four pages) and `game-week-brief.md`.
- `architecture-decisions.md`, including controls, local music-clock judging, smooth seeded AI drift, shape-aware FORM follow-up, multiplayer and scope.
- `drill-style-guide.md`, `step-0-presentation.md`, `pd-repertoire.md`, and the character pipeline/prompt records.
- Latest Taylor instructions: 2–4 human players, iPhone tilt, timed arrow steering with automatic travel, constrained steering, imperfect solo neighbors, dot/form tradeoff, no-input holds, and useful scoring/ranking analytics.

## Baseline we should preserve

Browser/landscape and cross-device play; Web Audio as the judging clock; positions/counts in show files; automatic travel and alternating feet; path-relative corrections rather than free roaming; smooth imperfect AI neighbors; holds stand still and input is penalized; DOT and FORM remain separate visible captions. Original assets only, two distinct shows, a complete start-to-results/replay flow, and a visible drum major remain assignment/scope requirements. Three.js stays the engine.

The current playtest uses 50/50 DOT/FORM within Visual, arrival-heavy DOT sampling, a timing modifier, a small shared band result, and hold deductions. These are a starting point for tuning, not the answer to Taylor's requested weighting discussion. The current FORM implementation is still a neighboring-displacement approximation; shape-aware form fitting and interval checks are specified but not complete. The displayed dot ring is a visual marker; distance must be scored from the actual dot point rather than treating the entire ring as a perfect zone.

The earlier locked multiplayer scope says exactly two humans; Taylor's latest requested target is **2–4**. Carry that change into the revised multiplayer design rather than silently building only two. Multiplayer and iPhone controls are not implemented by the art checkpoint.

## Ordered question queue

1. **Confirmed — rhythm and direction:** Taylor chose Space on every moving count plus left/right arrows for direction. Rhythm inputs must synchronize with character steps. This supersedes correction-only rhythm judging.
2. **Confirmed mobile mapping; response details open:** Taylor chose screen taps on every moving count plus phone tilt for direction. Missed moving counts now mean no travel; resumed valid taps produce larger recovery steps. Resolve recovery limits and early/late handling, then how held arrows/tilt apply steering and cross hold boundaries.
3. **DOT versus FORM:** when an imperfect band makes both impossible to maximize, favor DOT, favor FORM, or start at equal weight? Choose an initial numeric mix and a concrete off-dot/clean-form example for playtesting.
4. **What FORM rewards most:** how much should being centered between immediate left/right neighbors matter relative to front/back spacing and alignment to the fitted line/arc/block? The fitter must exclude the judged player, bound outliers and blend through transitions; those safeguards are already agreed.
5. **Dot precision:** what physical error deserves Perfect/Good/poor at arrival, and should there be any full-credit radius? Existing 6/12-inch examples are provisional. Keep the visible target small without confusing its display size with the scoring curve.
6. **Steering limits and assistance:** how much sideways correction should be possible within one eight-count move, and how strongly should the automatic path recover toward the dot? Tune against a concrete playtest rather than enabling free wandering.
7. **AI imperfection:** choose the beginner/advanced error range and how much error remains at arrivals. Keep individual tendencies plus fresh seeded variation; never perfect neighbors, random teleportation or arbitrarily impossible interval targets.
8. **Holds:** what deduction should an accidental input cost, and how should held keys or a phone still tilted at the start of the hold count? Preserve planted feet and no mark time. Prevent key-repeat from turning one press into dozens of faults.
9. **Solo score and AI luck:** should rolled band performance directly affect the final solo rank, or should AI luck influence difficulty only through the live form? Multiplayer peers already share the seed, so luck must not choose the winner.
10. **Four-player formation:** should the four human slots be consecutive neighbors, two pairs, or distributed through the form? Design equal opportunities to influence FORM and fair judging for edge/middle slots; fill unused slots with AI.
11. **Recap analytics priority:** **step size is required (Taylor, Nov 3)**: compare written and actual steps, zero-step misses and larger recovery steps. Decide which summaries and scoring effect to show. Which should lead the results screen: overall rank, DOT/FORM captions, or a per-page diagnosis? Other candidate details: average/arrival dot error in inches, interval error, count/page score timeline, rushing/dragging, hold faults, and comparison with the same seed. Select the smallest useful set first.
12. **Competition and progression:** retain individual side-by-side ranking and DOT tie-break from the current docs, or change the match goal when there are four humans? Decide medals/pass thresholds and how two distinct shows unlock or are selected.
13. **Show content and approval:** confirm instructor acceptance of competitive marching under Racing and original AI assets/music if still unanswered; select the two public-domain music/drill experiences. The existing repertoire list is research with unverified dates, not clearance to ship a chosen piece.
14. **iPhone acceptance test:** identify the phone(s) used to judge tilt feel and frame rate. Test motion permission, neutral calibration, tap fallback, landscape, audio start, foreground/drop behavior and mixed phone/laptop matches. Existing host/code/link joining and AI takeover on disconnect remain the default; discuss rejoining only if desired.

## Discussion status

Control mapping confirmed November 3: Space + arrows on laptop; screen taps + tilt on mobile. No count taps on holds, as already requested. The current build still has the old input contract; implementation follows the response/scoring decisions.

**Miss/recovery behavior confirmed:** a missed moving count produces no step. On resuming valid taps, the marcher takes larger steps to recover; this affects the score. Step size is required in analytics, comparing written and actual movement and identifying recovery steps. Exact scoring penalties have not been selected.

**Recovery limit confirmed:** 4-to-5 = 45 inches per step = 2 stored 8-to-5 units per moving count. Regular 8-to-5 = 22.5 inches, so recovery may use at most twice the regular step length. Distinguish drill-sheet notation from the prototype's separate show-checker `maxStep` field; this decision sets the player recovery limit, not a silent rewrite of existing drill.

**Recovery deadline and hold boundary confirmed:** recovery aims for the current set's original dot arrival count using the remaining counts, capped at 4-to-5. If that is insufficient before a hold, the marcher stays at the actual reached position throughout the hold, regardless of dot/form error. No automatic catch-up movement during holds; judge the actual position.

**Next question, one at a time:** when movement resumes after an off-dot hold, should the marcher head directly from their actual position toward the new set's dot, using that new set's count budget and the same recovery cap? Then resolve early/late taps, foot alternation after a miss, and whether step-size deviation receives a direct penalty in addition to DOT/FORM/timing consequences.

Remaining queue items will be refined or skipped as answers arrive. Taylor's earlier message ended with “make sure”; allow them to add that unfinished requirement when ready.
