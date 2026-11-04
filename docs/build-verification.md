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
