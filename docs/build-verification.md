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
