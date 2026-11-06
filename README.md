# On the Dot

A browser marching game: steer automatic marching, find your dot, and preserve the form around imperfect neighbors. Play solo or compete beside 1–3 friends while contributing to a separate band score.

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

- **Aim with the mouse. Feet march automatically on the musical clock.** Space is unused. Your aim controls direction; recovery is capped at **4-to-5 (45 inches per count)**, with shorter steps during sharp corrections.
- **Holds stop travel automatically**, wherever you actually arrived. Right foot contacts on the last moving count; the left closes by hold one. Continuing sets use body-centered dot arrivals. Left contacts odd counts, right contacts even counts.
- **One prescribed RIGHT 360° turn** occurs later in Sunrise, starting at count 65. The large six-count warning asks you to press **→** once (or tap the Right button). The band turns right together; a missed cue skips your turn and adds a technique deduction.
- **Escape / Pause** pauses solo only. Resume counts **1, 2, 3, 4** before continuing. Multiplayer keeps its shared clock.
- The bottom-left beat blocks show the pulse and current set count; sets can contain four or eight counts. Top-left shows current/next movement and counts remaining. The initial count-off is eight beats: `5… 6… 5, 6, 7, 8`.
- Ground links show neighbor spacing; a local curve guide and compact readout indicate even/close/wide spacing and inside/outside form position. Mouse aim remains visible during holds; the next dot gets a three-count preview.
- **Sliding:** hips, knee planes, and foot tracks turn toward lateral travel while chest and horn remain front-facing. Backward marching stays on the toes and square to the front, including on diagonals up to 60° off straight back; only mostly-sideways travel slides. Pivot turns use separate planted-foot quarter steps.
- **Overhead** toggles the camera. The drum-major sketch conducts 4/4 from the same audio clock. For close movement inspection, open `/?view=feet`.

On iPhone, use landscape and enable/recenter tilt. Tilt steers while stepping follows the music automatically; turn cues provide a Right touch button. Motion permission requires HTTPS (localhost applies only to that same device). Real iPhone and cross-device play verification remain outstanding.

## Movement study

Open `/marching.html` for the rebuilt lower-body animation review. It runs one continuous sequence: set, left-foot preparation, eight standard steps, right-foot arrival and left-foot close. Planted feet use fixed field coordinates, with heel/forefoot pivots and no per-frame history.

Use quarter/eighth/half/full speed, the scrubber, numbered contact buttons and Side/Front/Back/Feet cameras. Cyan marks anatomical left; gold marks right. Both performers and forward/backward movement are available. The game now uses the same explicit-pose rig with its field-space gait, sliding and pivot sequences. This standalone fixed sequence remains available for slow-motion review.

## Multiplayer

Create a private room, share its link or code, and join on separate devices. The host selects the show/difficulty. Every player confirms Ready after assets, audio and peer links are ready. Two to four humans occupy adjacent slots. Each device judges against its own Web Audio clock; position streams use WebRTC data channels through the host.

A disconnected marcher becomes AI for the others and the player’s result is incomplete. On reconnection, control returns after an announced countdown; that result remains ineligible for records/unlocks. A reload requires tapping **Enable audio and rejoin**. A replacement host is chosen if the host disconnects. The room service keeps only ephemeral room state in memory; restarting it ends existing rooms.

## Scores and progression

- DOT / FORM start at **50/50**.
- FORM splits nearby spacing / fitted line-or-curve alignment **50/50**, excluding self from the fit and bounding each neighbor’s influence.
- Justified form adjustment receives **half the usual DOT penalty** for eligible displacement. Analytics still show actual distance.
- Automatic footwork removes rhythm timing deductions. Step-size, direction and missed-turn errors incur technique deductions. These defaults live in `src/repertoire.ts` for tuning.
- During play, show coaching warnings and HOLD/MOVE cues, not performance numbers.
- Results show individual ranking, a separate host-calculated shared band score, and per-set analytics.
- **65 individual points** unlock the second show on any difficulty. Full completed solo/multiplayer runs qualify; incomplete runs do not. Personal bests are separate per show/difficulty and saved in the current browser. Host-unlocked shows are playable by guests.
- Full-show retries only. Each attempt has fresh AI variation; Easy/Medium/Hard changes error size and frequency. Tempo stays fixed for each show across difficulties.

## Shows and assets

**Sunrise:** 120 BPM challenge, 112 counts / 56 seconds, with diagonal travel, changing intervals, evolving curves and one later right turn. The original slower Sunrise remains a reference fixture. **Sunrise / Reprise:** separately rendered, transposed and articulated brass score with a faster tempo map, diagonal drill and twilight lighting; 112 counts / about 69 seconds. Both include mapped holds. The eight-count `5… 6… 5, 6, 7, 8` is scheduled separately from the music.

All visuals and audio are original generated or code-built assets. The 12 complete playing-pose marchers remain six women and six men. No player model picker yet; gender/instrument/possibly uniform customization is deferred. The drum major is the requested sketch-stage visual, not final character art. Music remains the approved synthesized draft.

Review pages: `/uniform.html` and `/music.html`. Provenance: `docs/art/character-pipeline.md`, `docs/music/sunrise-arrangement.md`. Regenerate the challenge with `python3 scripts/render-sunrise.py --challenge`, or the reprise with `--reprise`, in an environment with numpy.

## Verify

```sh
npm run check
npm test
npm run test:rooms
npm run build
npm audit --audit-level=high
```

GitLab CI runs all five gates and retains `dist/`. The legacy `game.ts`/`show.ts` tests remain as historical prototype coverage; the live game uses `performance.ts`/`repertoire.ts`. Tests cover automatic contact scheduling, capped body/foot travel, planted turns, sliding, off-dot halt balance, scoring, progression, music maps and drill safety, plus room authority/readiness/capacity/disconnect behavior. Historical tap-driven regression coverage is retained.

## Deployment and outstanding device checks

After `npm run build`, `npm start` serves both `dist/` and room signaling on port 8787. A multi-stage `Dockerfile` is included for a single-instance deployment. Put this entry behind HTTPS, disable SSE buffering, and allow long-lived connections. Alternatively, host `dist/` separately with `/api` reverse-proxied to the room service. This is a signaling service, not an authoritative gameplay server. Static-only hosting provides solo but cannot provide room signaling by itself.

Environment:

- `HOST` (default `127.0.0.1`), `PORT` (8787), `STATIC_DIR` (`dist`), `TRUST_PROXY` (`1` behind a host proxy, so rate limits are per player; the Dockerfile sets it).
- `ALLOWED_ORIGINS`: comma-separated production HTTPS origins.
- `ICE_SERVERS`: JSON array of WebRTC ICE servers. Default: Cloudflare’s public STUN server. For reliable cross-network play, configure a TURN relay with short-lived client credentials. Do not put a provider’s master API token here: ICE configuration is sent to room participants. Avoid logging SSE token query strings.

No paid relay or production hosting was purchased/deployed by this implementation. Before calling this release-ready, test physical iPhone Safari permission/tilt/audio, four-device performance, and forced TURN on different networks. Local two-browser tests do not establish those results. Detailed music and drum-major production art remain future polish.
