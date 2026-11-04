# Sunrise — Strauss Fanfare Study (draft 2 — brass only)

Taylor selected the opening of Richard Strauss’s *Also sprach Zarathustra* (1896), with flexible tempo and natural holds. This replaces neither final show selection nor the old rehearsal automatically: review the musical draft first.

## Source and originality

Source edition: [University of Rochester / Sibley Music Library, 1896 Aibl edition, Otto Singer piano reduction](https://urresearch.rochester.edu/institutionalPublicationPublicView.action?institutionalItemVersionId=13420), explicitly catalogued as public domain. [Scan](https://urresearch.rochester.edu/fileDownloadForInstitutionalItem.action?itemFileId=31357&itemId=13554).

The opening C–G–C gesture and minor/major fanfare contrast inform this original shortened game study. This is not an exact transcription of the first 1:20 of either video. No band arrangement, recording, samples, soundfont or impulse-response asset is copied or uploaded to a generator. Every tone is synthesized by our renderer. Revision 2 removes all percussion and uses separate trumpet, mellophone, baritone and tuba profiles, three slightly varied synthesized players per note, tongue attacks, brightness bloom and staggered breaths. Revision 1 is retained in git history. The YouTube recordings were supplied as references; their audio was not accessible to the assistant.

## Musical shape and drill suggestions

112 counts; 79.048 seconds plus 3 seconds of release. Count indices in the JSON are zero-based; the listening page displays counts starting at 1.

| Counts (display) | Phrase | Proposed drill |
| --- | --- | --- |
| 1–8 | Low foundation / first light | Hold |
| 9–24 | First fanfare call | Move |
| 25–32 | Minor-to-major impact | Hold |
| 33–48 | Answering call, low-brass responses | Move |
| 49–56 | Second impact | Hold |
| 57–72 | Third call, expanded brass | Move |
| 73–80 | Full ensemble arrival | Hold |
| 81–96 | Original rising connective phrase | Move |
| 97–112 | Broad final arrival and release | Hold |

Tempo: 84 BPM initially, 96 at index 32, 84 at index 64, 72 at index 96. This draft chooses new phrase lengths and tempo changes rather than trying to match a reference recording’s timestamps. These are editable choices for review. Holds are drill instructions: the band continues playing and the drum major continues conducting.

## Files and regeneration

- `scripts/render-sunrise.py`: editable notes, brass voices, section and tempo definitions; deterministic render, Python 3 + numpy.
- `public/music/sunrise-score.json`: notes, count/tempo map and contiguous movement/hold sections.
- `public/music/sunrise-demo.wav`: stereo 32 kHz 16-bit PCM demo; source-generated audio, no external assets.
- `/music.html`: listening preview with native playback controls, phrase tracking and 75–125% tempo audition.

Run `python3 scripts/render-sunrise.py` in an environment with numpy. In this workspace use `/Users/test/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`. Then `npm run check`, `npm test`, `npm run build`.

This is an arrangement demo, not the final lifelike brass production. Taylor should review the sound before a production render. The listening-page speed slider is audition-only; final music playback, drill, count-in and judging must share the same tempo map. The old game is 80 counts at 112 BPM and cannot be overlaid with this 112-count arrangement. Gameplay integration requires new drill matched to this score; retain the playable rehearsal until that slice is ready. The eight-beat count-in is not baked into the WAV and will be scheduled separately by the game.

## Next production pass

Code synthesis makes a playable arrangement sketch but cannot establish acoustic realism by itself. For a lifelike performance, use a music-generation service with our own demo as the musical reference, or record original brass. Do not upload the YouTube references. No music-generation service is connected in this session, and no paid generation has been run. Review commercial-use terms before selecting one. See `sunrise-production-prompt.txt` for the proposed production direction. The final take needs a new verified beat map if its timing differs.
