# Agent instructions

Rules for any AI assistant working in this repo. Read `docs/architecture-decisions.md` before changing behavior; it is the spec.

## Stack
- Three.js + TypeScript, built to static files. No game server.
- Web Audio API directly (no audio library). The music clock is the master clock.
- Multiplayer: WebRTC peer-to-peer with a tiny signaling service and a TURN relay (§14).

## Hard rules
- **Deadline:** Thursday Nov 5, 2026, midnight. Polish over size. Each step in §16 must leave the game playable.
- **No pre-made assets.** No asset-store or library models, sample packs, free sound effects or stock music. Everything is built in code, AI-generated for this game, or recorded by Taylor.
- **Music:** public-domain compositions only, arranged by us. Never use a corps arrangement or upload corps recordings to an AI tool. See `docs/pd-repertoire.md`.
- **No real trademarks:** no "Halo", no real team, school or corps logos.
- **Judging is local:** each device judges its own player against its own music clock. Never let network lag affect scoring.
- **Read actions, not keys:** keyboard, touch and phone tilt all map to the same actions.
- **Counts, not seconds,** in show files and UI. The tempo map converts.
- Positions are stored in 8-to-5 steps, quarter steps only (§4).

## Working style
- Keep the existing module structure; the marcher model lives in one module so it can be swapped.
- Run the tests (translator, show checker, tempo map) after changes; add a small test for new logic.
- When a decision in the architecture doc changes, update the doc in the same change.
- Ask Taylor before changing anything marked **Locked**.
