import { TempoMap } from "./tempo";
import { checkShow, type Dot, type Show } from "./drill";
export type Difficulty = "Easy" | "Medium" | "Hard";
export const difficulties: Difficulty[] = ["Easy", "Medium", "Hard"];
export const tuning = {
  maxStep: 2,
  holdRadius: 0.35,
  steerRadians: Math.PI / 7,
  steerNudge: Math.PI / 30,
  unlock: 65,
  dotWeight: 0.5,
  spacingWeight: 0.5,
  formDiscount: 0.5,
  timingPenalty: 0.2,
  sizePenalty: 0.1,
  directionPenalty: 0.1,
  holdPenalty: 1.5,
};
export type GameShow = {
  id: string;
  name: string;
  subtitle: string;
  audio: string;
  tempo: TempoMap;
  drill: Show;
  page: (count: number) => number;
  target: (count: number) => Dot[];
  goal: (count: number) => Dot[];
  hold: (count: number) => boolean;
  backward: (count: number) => boolean;
};
const q = (v: number) => Math.round(v * 4) / 4;
function makeShow(id: string, name: string, reprise = false): GameShow {
  const line = (y: number, curve = 0): Dot[] =>
    Array.from({ length: 12 }, (_, i) => ({
      x: (i - 5.5) * 4,
      y: q(y + curve * Math.sin((i / 11) * Math.PI)),
    }));
  const initial = line(40);
  const dots = [
    initial,
    line(32),
    line(24),
    line(24),
    line(32),
    line(40),
    line(40),
    line(32, reprise ? -4 : 4),
    line(24, reprise ? -4 : 4),
    line(24, reprise ? -4 : 4),
    line(16),
    line(8),
    line(8),
    line(8),
  ];
  if (reprise) {
    const shifts = [0, 4, 8, 8, 4, 0, 0, -4, -8, -8, -4, 0, 0, 0];
    for (let page = 0; page < dots.length; page++) {
      dots[page] = dots[page].map((dot) => ({
        x: dot.x + shifts[page],
        y: dot.y,
      }));
    }
  }
  const names = [
    "First light",
    "First call",
    "Open the sound",
    "First impact",
    "Answering call",
    "Backfield answer",
    "Second impact",
    "Brass ascent",
    "Shape the arc",
    "Full ensemble",
    "Final approach",
    "Bring it home",
    "Sunrise arrival",
    "Final release",
  ];
  const drill: Show = {
    performers: Array.from({ length: 12 }, (_, i) => ({
      id: `B${i + 1}`,
      slot: i === 5 ? "player1" : i === 6 ? "player2" : undefined,
    })),
    initial,
    pages: dots.map((d, i) => ({
      name: names[i],
      counts: 8,
      facing: "front",
      form: i >= 7 && i <= 9 ? "arc" : "line",
      dots: d,
    })),
    totalCounts: 112,
    minSpacing: 2,
    maxStep: 2,
  };
  const errors = checkShow(drill);
  if (errors.length) throw Error(errors.join("\n"));
  const changes = reprise
    ? [
        [0, 96],
        [32, 108],
        [64, 96],
        [96, 84],
      ]
    : [
        [0, 84],
        [32, 96],
        [64, 84],
        [96, 72],
      ];
  const beats = [0];
  for (let c = 0; c < 112; c++) {
    const bpm = [...changes].reverse().find((x) => c >= x[0])![1];
    beats.push(beats[c] + 60 / bpm);
  }
  const page = (c: number) => Math.max(0, Math.min(13, Math.floor(c / 8)));
  const goal = (c: number) => dots[page(c)];
  const target = (c: number) => {
    const p = page(c),
      from = p ? dots[p - 1] : initial,
      t = Math.max(0, Math.min(1, (c - p * 8) / 8));
    return from.map((d, i) => ({
      x: d.x + (dots[p][i].x - d.x) * t,
      y: d.y + (dots[p][i].y - d.y) * t,
    }));
  };
  return {
    id,
    name,
    subtitle: reprise
      ? "A brighter answer · tighter tempo"
      : "Three calls · one arrival",
    audio: `/music/${reprise ? "sunrise-reprise" : "sunrise-demo"}.wav`,
    tempo: new TempoMap(beats),
    drill,
    page,
    target,
    goal,
    hold: (c) => {
      const p = page(c);
      return dots[p].every(
        (d, i) =>
          d.x === (p ? dots[p - 1] : initial)[i].x &&
          d.y === (p ? dots[p - 1] : initial)[i].y,
      );
    },
    backward: (c) => {
      const p = page(c);
      return dots[p][5].y > (p ? dots[p - 1] : initial)[5].y;
    },
  };
}
export const shows = [
  makeShow("sunrise", "Sunrise"),
  makeShow("reprise", "Sunrise / Reprise", true),
];
