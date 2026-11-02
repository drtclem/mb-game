import { type Dot, type Show } from "./drill";
const q = (n: number) => Math.round(n * 4) / 4;
const line = (y: number): Dot[] =>
  Array.from({ length: 12 }, (_, i) => ({ x: (i - 5.5) * 4, y }));
const arc: Dot[] = line(28).map((d, i) => ({
  ...d,
  y: q(28 + 5 * Math.sin((i / 11) * Math.PI)),
}));
const block: Dot[] = Array.from({ length: 12 }, (_, i) => ({
  x: (Math.floor(i / 2) - 2.5) * 4,
  y: 32 + (i % 2) * 4,
}));
const pages = [
  ["Step off", "line", line(28)],
  ["Open the arc", "arc", arc],
  ["Hold the arc", "arc", arc],
  ["Back it up", "arc", arc.map((d) => ({ ...d, y: d.y + 8 }))],
  ["Find the block", "block", block],
  ["Bring it front", "block", block.map((d) => ({ ...d, y: d.y - 8 }))],
  ["Hold the block", "block", block.map((d) => ({ ...d, y: d.y - 8 }))],
  ["One clean line", "line", line(24)],
  ["Hold the line", "line", line(24)],
  ["Final push", "line", line(16)],
] as const;
export const show: Show = {
  performers: Array.from({ length: 12 }, (_, i) => ({
    id: `B${i + 1}`,
    slot: i === 5 ? "player1" : i === 6 ? "player2" : undefined,
  })),
  initial: line(20),
  pages: pages.map(([name, form, dots]) => ({
    name,
    form,
    dots: [...dots],
    counts: 8,
    facing: "front",
  })),
  totalCounts: 80,
  minSpacing: 1.5,
  maxStep: 4,
};
