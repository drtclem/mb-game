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
