// Plain-words copy for /how-the-chances-work. Numbers come only from sim-stats.json,
// which `bun scripts/sim-harness.ts 100000 --write` regenerates from the real sim code.
// Wording rule: say "chance", never betting words (checked in scripts/test-explainer.ts).
import STATS from "./sim-stats.json";

export { STATS };

const pct = (n: number) => `${n}%`;
const oneIn = (n: number) => `about 1 in ${Math.round(100 / n)}`;

export const CHANCE_ROWS = [
  { key: "random", label: "Random picks", hint: "you pick any card each time", s: STATS.random },
  {
    key: "greedy",
    label: "A good draft",
    hint: "you take the highest-rated card each time",
    s: STATS.greedy,
  },
  {
    key: "bestXI",
    label: "The best possible XI",
    hint: "the top-rated legend in every slot",
    s: STATS.bestXI,
  },
] as const;

export const CHANCES_INTRO =
  "Every match is decided by your team's ratings plus a dose of luck. Better players give you a better chance, but nothing is ever certain. Here is what happens when the game's own engine plays the season many times.";

export const CHANCES_POINTS: string[] = [
  "Your eleven picks are turned into three numbers: attack, midfield and defence. Mentality helps in the knockout rounds.",
  "Opponents get stronger through the league phase and again through the knockout rounds, so the final is the hardest match.",
  "For every match, the game compares your numbers with the opponent's and then rolls the goals. A stronger team scores more often, but upsets happen, just like real football.",
  "Nobody picks the result by hand. The same draft and the same season seed always give the same result.",
  `Even the best possible XI goes 17-0 only ${pct(STATS.bestXI.perfectPct)} of the time (${oneIn(STATS.bestXI.perfectPct)}). A perfect season is meant to be rare.`,
];

export function chanceSentence(r: (typeof CHANCE_ROWS)[number]): string {
  return `${r.label}: ${pct(r.s.titlePct)} chance to win the title, ${pct(r.s.perfectPct)} chance to go 17-0 (${oneIn(r.s.perfectPct)}).`;
}

export function allChancesCopy(): string {
  return [CHANCES_INTRO, ...CHANCES_POINTS, ...CHANCE_ROWS.map(chanceSentence)].join("\n");
}
