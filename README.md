# On the Dot

A browser marching game: tap the musical count, find your dot, and preserve the form around imperfect neighbors. Play solo or compete beside 1–3 friends while contributing to a separate band score.

## Run locally

Node 22+:

```sh
npm ci
npm run rooms
```

In a second terminal:

```sh
npm run dev
```

Vite proxies `/api` to the room service on port 8787. Use the URL Vite prints. Solo works without the room service. An invite must use an address reachable by the other device; `127.0.0.1` points to that device itself.

## Play

- **Press an arrow on each moving count.** Each distinct press triggers one step; no Space or combinations.
- **Up / Down:** forward / backward travel. **Left / Right:** a step with a correction toward the current dot (the route remains guided). Key auto-repeat does not create extra steps.
- The camera does not flip for backward sets. Wrong-direction and extra presses visibly affect the marcher; recovery still tops out at **4-to-5 (45 inches)**.
- **HOLD:** stop pressing. An arrow press animates a small step in place, leaves the actual position unchanged, shows **Not yet**, and incurs a fault.
- **Escape / Pause** pauses solo only. Resume has a fresh count-in. Multiplayer keeps running.
- **Overhead** toggles the camera view. The drum-major sketch remains in a top-right inset, conducting through holds.

On iPhone, use landscape, enable motion permission, hold the phone comfortably and recenter tilt. Tilt forward/back for travel and sideways for corrections; use the **single STEP button** for rhythm. No touch-steering alternative. Phone motion requires HTTPS (localhost is sufficient only when running on that same device).

## Multiplayer

Create a private room, share its link or code, and join on separate devices. The host selects the show/difficulty. Every player confirms Ready after assets, audio and peer links are ready. Two to four humans occupy adjacent slots. Each device judges against its own Web Audio clock; position streams use WebRTC data channels through the host.

A disconnected marcher becomes AI for the others and the player’s result is incomplete. On reconnection, control returns after an announced countdown; that result remains ineligible for records/unlocks. A reload requires tapping **Enable audio and rejoin**. A replacement host is chosen if the host disconnects. The room service keeps only ephemeral room state in memory; restarting it ends existing rooms.

## Scores and progression

- DOT / FORM start at **50/50**.
- FORM splits nearby spacing / fitted line-or-curve alignment **50/50**, excluding self from the fit and bounding each neighbor’s influence.
- Justified form adjustment receives **half the usual DOT penalty** for eligible displacement. Analytics still show actual distance.
- Timing, step-size and direction errors incur separate technique deductions; hold taps add faults. These defaults live in `src/repertoire.ts` for tuning.
- During play, show coaching warnings and HOLD/MOVE cues, not performance numbers.
- Results show individual ranking, a separate host-calculated shared band score, and per-set analytics.
- **65 individual points** unlock the second show on any difficulty. Full completed solo/multiplayer runs qualify; incomplete runs do not. Personal bests are separate per show/difficulty and saved in the current browser. Host-unlocked shows are playable by guests.
- Full-show retries only. Each attempt has fresh AI variation; Easy/Medium/Hard changes error size and frequency. Tempo stays fixed for each show across difficulties.

## Shows and assets

**Sunrise:** original brass-only Strauss fanfare study; 112 counts / about 79 seconds. **Sunrise / Reprise:** separately rendered, transposed and articulated brass score with a faster tempo map, diagonal drill and twilight lighting; 112 counts / about 69 seconds. Both include mapped holds. The eight-count `5… 6… 5, 6, 7, 8` is scheduled separately from the music.

All visuals and audio are original generated or code-built assets. The 12 complete playing-pose marchers remain six women and six men. No player model picker yet; gender/instrument/possibly uniform customization is deferred. The drum major is the requested sketch-stage visual, not final character art. Music remains the approved synthesized draft.

Review pages: `/uniform.html` and `/music.html`. Provenance: `docs/art/character-pipeline.md`, `docs/music/sunrise-arrangement.md`. Regenerate the reprise with `python3 scripts/render-sunrise.py --reprise` in an environment with numpy.

## Verify

```sh
npm run check
npm test
npm run test:rooms
npm run build
npm audit --audit-level=high
```

GitLab CI runs all five gates and retains `dist/`. The legacy `game.ts`/`show.ts` tests remain as historical prototype coverage; the live game uses `performance.ts`/`repertoire.ts`. Tests cover tap consequences, recovery/hold boundaries, scoring, progression, both music maps and drill safety, plus room authority/readiness/capacity/disconnect behavior.

## Deployment and outstanding device checks

After `npm run build`, `npm start` serves both `dist/` and room signaling on port 8787. A multi-stage `Dockerfile` is included for a single-instance deployment. Put this entry behind HTTPS, disable SSE buffering, and allow long-lived connections. Alternatively, host `dist/` separately with `/api` reverse-proxied to the room service. This is a signaling service, not an authoritative gameplay server. Static-only hosting provides solo but cannot provide room signaling by itself.

Environment:

- `HOST` (default `127.0.0.1`), `PORT` (8787), `STATIC_DIR` (`dist`).
- `ALLOWED_ORIGINS`: comma-separated production HTTPS origins.
- `ICE_SERVERS`: JSON array of WebRTC ICE servers. Default: Cloudflare’s public STUN server. For reliable cross-network play, configure a TURN relay with short-lived client credentials. Do not put a provider’s master API token here: ICE configuration is sent to room participants. Avoid logging SSE token query strings.

No paid relay or production hosting was purchased/deployed by this implementation. Before calling this release-ready, test physical iPhone Safari permission/tilt/audio, four-device performance, and forced TURN on different networks. Local two-browser tests do not establish those results. Detailed music and drum-major production art remain future polish.
