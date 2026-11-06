import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { shows, turnStudy } from "./repertoire";
// The game's beat map and the rendered audio must agree, or the music drifts off the drill.
it.each([...shows, turnStudy].map((s) => [s.name, s] as const))(
  "%s: game beats match the music's beats and the audio covers the show plus release",
  (_, show) => {
    const file = `public${show.audio}`;
    const score = JSON.parse(
      readFileSync(
        file.replace("sunrise-demo.wav", "sunrise.wav").replace(".wav", "-score.json"),
        "utf8",
      ),
    );
    expect(score.beats).toHaveLength(113);
    score.beats.forEach((t: number, c: number) =>
      expect(show.tempo.seconds(c)).toBeCloseTo(t, 9),
    );
    const wav = readFileSync(file);
    const seconds = wav.readUInt32LE(40) / 4 / wav.readUInt32LE(24);
    expect(seconds).toBeCloseTo(score.beats.at(-1) + 3, 3);
  },
);
