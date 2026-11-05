# Full-build verification — November 3, 2026

## Local gates

- Type/unused-code check: passed.
- Vitest: 61 tests passed, including actual-timestamp calibration and music-clock rejoin regression coverage.
- Node service acceptance: 2 passed (room authority/readiness/capacity/disconnect and safe static serving/ranges).
- Production build: passed; existing large Three.js chunk warning remains.
- Dependency audit: no vulnerabilities reported.

## Browser observations

- Detailed 12-performer band loads with the approved six-women/six-men roster.
- Solo starts with count-in, can pause, and resumes with another count-in.
- Two browser players connected, readied, started together and reached separate individual results with one shared band score.
- Four production browser tabs connected through WebRTC, all confirmed Ready, started the same show and reached results. Idle players received zero rather than free timing points.
- Reloading the fourth player showed the user-gesture audio rejoin prompt while the other three continued. Both the host and returning player displayed the returning result as incomplete, with the same shared band score. Browser error logs were empty in that production test.
- This test exposed countdown-induced rejoin clock lag. The final code fixes it by scheduling music at the future ongoing-show offset; an audio-clock regression test verifies that rejoin does not freeze or delay the clock. Solo resume deliberately does freeze show time through its count-in.

## Limits

These are local observations, not proof of cross-network or iPhone readiness. Physical iPhone motion permission, tilt axes, audio activation and sustained frame rate need device testing. TURN credentials and public HTTPS hosting have not been provisioned. A Dockerfile is supplied but a container build was not run here (Docker is unavailable). Judging remains client-trusted for private friends' games, not cheat-resistant public competition.

Detailed drum-major art and production brass sound remain deferred. The visible conductor is an original animated sketch, and both music tracks are original synthesized demos. Judges/staff/crowd roadmap features are still outside this checkpoint.

## Keyboard travel clarification

Hands-on keyboard testing reproduced full 45-inch recovery travel with Up + Space. A separate sustained test of the first two moving sets recorded 22.5-inch standard steps and brought the player into the formation. Space alone intentionally marks time. Fixed a conflicting-input bug where enabling tilt could suppress held arrow keys, and added a non-numerical next-step mode indicator plus mark-time coaching. Three control regression tests reproduce the old conflict and verify keyboard priority, release and blur behavior. Updated checks: 64 unit tests, 2 service tests, type check and production build pass.

## Arrow-only revision and visible stride fix — November 4

Taylor replaced held arrows plus Space with one distinct arrow press per step. Hold actions now animate in place with no travel and show “Not yet”. Browser testing confirmed both the opening-hold warning and travel through a moving set with individual Up presses. A separate rig test verifies that the foot remains in its landed stride instead of resetting to attention between inputs. Keyboard focus is explicitly placed on the field at start. Current type checks, 69 unit tests and production build pass.

## Count structure HUD — November 4

Decoded the supplied 2.33-second metronome reference locally using a temporary software decoder. Added four active beat blocks, two-part eight-count phrasing, and current/next move cards. Browser verification captured the final-four count-in (5/6/7/8), opening hold preview, and subsequent moving set. A temporary 844×390 viewport check showed the HUD fitting in landscape; the override was reset. Browser error logs were empty. Type checks, 75 unit tests and production build pass. Physical iPhone testing remains separate.

## Steering and conducting synchronization — November 4

Added persistent bounded keyboard nudges, proportional tilt, a three-count upcoming moving-dot cue, and a conventional 4/4 conducting pattern driven by the shared count. Regression coverage verifies nudges/reset/cap, preview boundaries and hold skipping, and conductor beat agreement through both shows' tempo changes and count-in. Type checks, 82 unit tests and production build pass. Live browser inspection showed MOVE IN 3 during the opening hold, the cyan dot/arrow, and conductor BEAT 2 matching the active second beat block. Hold input still displayed Not yet. Browser error logs were empty. Physical-device verification remains outstanding.

## Mouse steering and prepared step-off — November 4

Desktop trial now maps field-projected mouse aim to actual step direction, with distinct Space presses supplying rhythm. Automated tests verify travel follows aim rather than the dot, the recovery cap remains, and hold presses cannot travel. Preparation boundary tests cover the and of eight, continued holds and first tapped left-foot landing; halt arrival reference tests distinguish moving and held destinations. Type checks, 92 unit tests and production build pass. Browser testing loaded the revised instructions, aimed at the field, tapped Space and observed a visible stride and updated heading with no console errors. Detailed foot choreography still needs Taylor's visual review.

## Dot distance audit — November 4

Reproduced the reported problem in the actual performance engine: exact/30-ms-late taps reached opening destinations at y=32 and y=24; 30-ms-early Perfect taps reached y=33 and y=25, with a false opening-hold fault. Fixed beat assignment for movement calculations. Regression tests now check both opening dots at exact and ±30/80 ms, all moving destinations in both shows, no pre-set travel, hold faults and bounded recovery. The existing late-moving-step hold-boundary test remains, using a tap outside the newly aligned timing window; a separate test verifies the early hold-downbeat case is stationary. Type check, 102 tests and production build pass. Browser smoke inspection confirmed the second moving target switches with Open the sound, count 1/8; exact distances are verified by engine tests rather than browser timing automation.

## Consecutive Space travel — November 4

A second travel regression reproduced with two taps 200 ms apart: the first accepted one-unit step ended at y=39, but the next step began at y≈39.671, silently dropping ≈0.671 units. Separated accepted endpoints from visual interpolation origins. Tests verify conserved tap distance, no position discontinuity at a new tap, and sixteen alternating ±80 ms taps retaining standard step sizes and both arrival dots. Type check, 104 tests and build pass. A longer browser playtest sent sixteen Space presses with varying intervals across moving sets/transitions, observed visible travel, and had no console errors. This verifies keyboard operation; subjective audio/motion feel still requires user review or a recording with sound.

## Extra halt step — November 4

Found two visual causes: generic final-count swing continued until the hold boundary, and halt closure added lift to both feet. Replaced it with a planted final right-foot pose and a left-only closing pose. A regression test evaluates five closure phases and proves the right foot's world-space forward coordinate remains constant with zero lift/roll while the left closes. Type check, 105 unit tests and build pass. Live screenshots captured moving count 8/8, hold count 1/8 and hold count 2/8; the band transitions from the planted arrival to feet together without a new right-foot lift. Browser error logs were empty.

## Halt phase handoff — November 4

The earlier pure closure test missed the preceding gait: immediately before the planted arrival the ordinary right-foot travel was +0.5, while the arrival requested -0.5, a one-stride discontinuity. Added an actual skeletal rig fixture and transition tests, aligned AI contact phase/body reference, and moved the left closing swing before the hold downbeat. Tests check the real right ankle through six closing phases, no full-stride handoff jump, and feet closed at the hold downbeat. Type check, 108 tests and build pass. Browser captures compare moving count 8/8 with hold count 1/8 and now show a closed stance on the hold downbeat. Console error logs were empty.

## Instructional first-step reference — November 4

Read the complete auto-caption transcript of Taylor's linked Tyler Loretz video and inspected the demonstrations, including the forward step-and-freeze at 6:04. No recording or third-party model was incorporated. Applied independent left-foot reset/alternation, low forward/backward preparation, forefoot push and input-time foot contact. Tests cover clean odd/even contacts, holds with extra prior taps, skipped initial sets, aborted preparation and ankle/clearance profiles. Type check, 114 tests and build pass. Browser smoke play used four distinct Space inputs in the moving set, with no console errors. Exact movement remains tested in the existing distance regression suite; final naturalness still needs user review.

## Anatomical foot identity — November 4

Found mirrored model preparation and skin binding: the nominal Left leg occupied +X even though actors face -Z. Corrected both geometry-side ordering and vertex-to-joint assignment, plus old test fixtures that repeated that reversal. New checks derive anatomical right from facing×up, assert left lies on the opposite side, and verify physical ankle contact order for player and AI across sixteen counts in both forward and backward travel. Added missed/extra tap parity recovery coverage. Type check, 117 tests and build pass. Browser captures compared the first and second moving counts after real Space presses; console error logs were empty. These checks establish anatomical ordering, not a claim that every aspect of animation naturalness is final.

## Coherent lower-body preview — November 5

Added a field-space placement sequence and new explicit-pose rig path. Tests verify all eight contacts in both directions, planted support coordinates, continuous preparation/contact/closure transitions, closed hold, heel/forefoot ground pivots on the actual skeletal rig and frame-order independence. Existing gameplay and rig regression tests continue passing: 122 total. Type check and production build pass.

Browser review of the new movement study checked count one, the passing position, count eight, closing at 8-and, and the final feet-together hold. Tested forward/backward, front/side views, both original performer models, direct scrubbing and count buttons. Console error logs were empty. This is a reviewable animation prototype, not a completed replacement of the full game's input-dependent animation.

## Movement study refinement — November 5

Backward marching now keeps both heels raised through movement and settles them into the halt. Reduced swing clearance with smooth lift-off, smoothed body velocity at step-off and arrival, and softened the new rig path's knee extension constraint. Left-foot closure starts just after count eight and finishes on hold one. These changes apply to the movement study; the full game's legacy animation is unchanged. Added three regressions for backward heel elevation, prompt closure and continuous body speed. All 125 tests, type check and production build pass. Browser side-view inspection confirmed the raised-heel backward pose.

## Track and halt stance — November 5

Added explicit shoe yaw to the lower-body pose and rig adapter. Marching yaw remains zero, while the halt blends to a 45-degree right turnout and offset left heel-to-arch placement. Regression coverage checks both travel directions; 126 tests and type check pass.

Halt refinement (Nov 5): both feet now turn outward 45 degrees, making a 90-degree angle. The right placement stays fixed; the left turns about its heel to preserve heel-to-arch contact. Marching remains parallel.

Shoe orientation correction (Nov 5): zero ankle yaw did not remove turnout baked into the source mesh. Measure each model's sole long axis and cancel that authored yaw in the explicit lower-body pose adapter before applying the requested march/halt orientation. Legacy gameplay animation is unchanged. Added a synthetic turned-sole regression; all 127 tests, type check and build pass. Browser front and feet views inspected at the passing position confirm parallel visible shoes.

## Reviewed gait integrated into gameplay — November 5

All game roster animation calls now use the reviewed lower-body solver and contact profiles. A stride adapter scales the sequence to the actual movement vector while preserving gameplay-owned world position, input timing, scoring and remote step handling. Shoes cancel their authored turnout, stay parallel while moving, and turn out at halts; backward motion retains raised heels. Final closure now spans count eight to hold one without the old half-count delay. The standalone movement study remains available. Type check, 128 unit tests, two room acceptance checks and production build pass.

## Automatic-footwork steering trial — November 5

Taylor approved trying music-clock steps with mouse/tilt steering instead of rhythm taps. Schedule one step on each moving count, interpolate travel for the full beat, alternate left/right from musical counts, and suppress all steps during holds. Mouse aim is sampled for each beat; mobile retains tilt steering. Desktop starts facing forward until the mouse is moved. Space does not move the performer; horn cues remain deferred. The beat-clock gait now drives the player as well as AI. Timing deductions are disabled for automatic runs; dot/form, step size and direction remain judged. The manual rhythm button and timing-calibration entry are hidden for this trial.

## Field anchors and form guidance — November 5

Replaced the game's separate gait/arrival branches with one persistent field-space sequence per marcher. Each beat commits the previous swing anchor, keeps the support foot fixed, captures the next placement and moves the body continuously to its accepted endpoint. Holds keep the actual arrival position; no separate body-to-dot snap runs. Retry clears all anchor state. The existing explicit lower-body rig renders these anchors, retaining parallel shoes, backward forefoot posture and halt turnout.

Added visible links to the adjacent performers with measured spacing and EVEN / TOO CLOSE / TOO FAR feedback against written intervals. A local curve guide passes through the adjacent actual performers and the existing fitted form reference. Signed radial error against the translated written local circle distinguishes inside/outside a curve; straight forms use a line cue. DOT/FORM weights remain 50/50 pending further play review.

Validation: type check, 134 tests, two room acceptance tests and production build pass. New regressions cover planted support under changing steering, continuity across beat boundaries, stationary off-dot holds, retry reset, backward stance and translated curve-side detection. Browser run confirmed the visible spacing guide and readout with no console errors. Animation naturalness still requires play review; the old standalone study remains available.

## Eight-count movement / four-count turn trial — November 5

Taylor requested an opening of move eight, hold four while turning, then continue. The default Sunrise trial now starts moving after the count-in, holds/turns for four, then moves eight sideways. A second four-count turn follows, with the remaining drill continuing on bar boundaries. It retains the same 112-count audio and exact tempo map; this changes choreography, not the arrangement or recording. The original fixed-eight Sunrise remains the reference fixture, while the trial is the playable Sunrise configuration. Reprise remains unchanged. Generalized set boundaries in movement, AI errors, expected steps, results and HUD; drill validation now permits complete four-count bars.

Leg correction: swing contacts now aim ahead of the body instead of leaving support a full stride behind it, and the rig allows the pelvis clearance required for long steps. During the new turn holds, both feet settle under the stationary body (a turn/reposition, superseding the old strict planted-right closure for this gait). World anchors convert into the body's rotated local coordinates when it turns. Added maximum-stride reach and balanced-halt regressions.

Retained ground guides; reduced the spacing panel to compact L/R hints. Recovery feedback now directs attention to the local form. Validation includes 137 tests, type check, room checks and build. New trial regression verifies eight moving counts, four held counts, resuming at count twelve, correct four-count HUD, and identical music-clock times. Browser inspection confirmed HOLD 4 and 3/4 count display with no console errors. Visual leg quality remains under review.

Turn clarification (Nov 5): Taylor intended a full 180-degree about-face during each four-count turn hold. Replaced the quarter-turn with a half-turn and restored the original forward/back field path (removed the invented eight-step lateral shift). Timing, music and form guides remain unchanged. Regression asserts that the resumed move uses the original Sunrise dots.
