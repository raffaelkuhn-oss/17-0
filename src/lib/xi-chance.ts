/**
 * "1 in N" XI stamp: how often THIS XI goes 17-0 (and wins the title) in our sims.
 *
 * simulate() (sim.ts) depends only on the XI's four rounded team ratings (attack, midfield, defence,
 * mentality) and the seed, and every match is independent given those ratings. So the chances are
 * computed exactly, in closed form, instead of by sampling seasons: the same Poisson goal model,
 * extra-time and penalty rules as sim.ts, summed over every score line. ~35 µs per XI, identical on
 * the device, in SSR and on the Worker (og image), and free of sampling noise. scripts/test-xi-chance.ts
 * checks it against simulate() so the two can't drift apart. Copy: /workspace/aha/copy-stamp.md (final).
 */
import { PLAYOFF_CUTOFF, SIM_TUNING, teamRatings, type Squad } from "./sim";

type Ratings = { attack: number; midfield: number; defence: number; mentality: number };

/** Goals are capped at 7 in sim.ts poisson(): P(7) takes the whole tail. */
function goalPmf(lambda: number): number[] {
  const out = new Array<number>(8).fill(0);
  let p = Math.exp(-lambda);
  let cum = 0;
  for (let k = 0; k < 7; k++) {
    out[k] = p;
    cum += p;
    p *= lambda / (k + 1);
  }
  out[7] = Math.max(0, 1 - cum);
  return out;
}

/** Same expected goals as sim.ts playMatch(). */
function matchPmfs(r: Ratings, opp: number, clutch: number) {
  const attEdge = (r.attack * 0.6 + r.midfield * 0.4 - opp) / 10;
  const defEdge = (r.defence * 0.7 + r.midfield * 0.3 - opp) / 10;
  return {
    gf: goalPmf(Math.max(0.25, 1.15 + attEdge * 0.62 + clutch)),
    ga: goalPmf(Math.max(0.35, 1.45 - defEdge * 0.55 - clutch)),
  };
}

const LEAGUE_GAMES = 8; // sim.ts LEAGUE_OPPONENTS, rated 66 + (i / 7) * 10
const KO_ROUNDS = 5; // Playoff, R16, QF, SF (two legs each), Final (one game)

/** Exact chance (0..1) that this XI goes 17-0 and that it wins the title, per sim.ts rules. */
export function xiChances(r: Ratings): { perfect: number; title: number } {
  // League phase: chance of 8 wins out of 8, and of reaching PLAYOFF_CUTOFF points.
  let points = new Map<number, number>([[0, 1]]);
  let perfect = 1;
  for (let i = 0; i < LEAGUE_GAMES; i++) {
    const { gf, ga } = matchPmfs(r, 66 + (i / 7) * 10, 0);
    let w = 0, d = 0;
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
      if (a > b) w += gf[a]! * ga[b]!;
      else if (a === b) d += gf[a]! * ga[b]!;
    }
    perfect *= w;
    const next = new Map<number, number>();
    const add = (k: number, v: number) => next.set(k, (next.get(k) ?? 0) + v);
    for (const [p, pr] of points) {
      add(p + 3, pr * w);
      add(p + 1, pr * d);
      add(p, pr * (1 - w - d));
    }
    points = next;
  }
  let title = 0;
  for (const [p, pr] of points) if (p >= PLAYOFF_CUTOFF) title += pr;

  // Knockouts: every leg is decisive (extra time adds one goal), level ties go to penalties.
  const clutch = (r.mentality - 88) / 12;
  const pExtra = 0.5 + (r.mentality - 88) / 90;
  const pPens = 0.5 + (r.mentality - 88) / 100;
  for (let k = 0; k < KO_ROUNDS; k++) {
    const isFinal = k === KO_ROUNDS - 1;
    const opp = SIM_TUNING.KO_BASE + k * SIM_TUNING.KO_STEP + (isFinal ? SIM_TUNING.FINAL_BONUS : 0);
    const { gf, ga } = matchPmfs(r, opp, clutch);
    const diff = new Map<number, number>(); // goal difference of one decisive leg (never 0)
    const add = (k2: number, v: number) => diff.set(k2, (diff.get(k2) ?? 0) + v);
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) {
      const p = gf[a]! * ga[b]!;
      if (a === b) {
        add(1, p * pExtra);
        add(-1, p * (1 - pExtra));
      } else add(a - b, p);
    }
    let legWin = 0;
    for (const [d, p] of diff) if (d > 0) legWin += p;
    if (isFinal) {
      perfect *= legWin;
      title *= legWin;
      break;
    }
    perfect *= legWin * legWin;
    let through = 0;
    for (const [d1, p1] of diff) for (const [d2, p2] of diff) {
      const s = d1 + d2;
      if (s > 0) through += p1 * p2;
      else if (s === 0) through += p1 * p2 * pPens;
    }
    title *= through;
  }
  return { perfect, title };
}

/**
 * Tier cut-offs by the XI's rounded N (17-0 about 1 in N; lower N = stronger XI). The ONE place to
 * move them (copy-stamp.md v2, 18 Oct: ≤200 / 201–450 / 451–900 / 901–2,500 / over 2,500); the words stay.
 * N is exact, so there is no "never 17-0" state: every XI has a real N.
 */
export const XI_TIERS = [
  { maxN: 200, name: "Immortals", flavour: "This XI was built for nights like these" },
  { maxN: 450, name: "Contenders", flavour: "Good enough to win it all. Perfect is another story" },
  { maxN: 900, name: "Dark horses", flavour: "Nobody fears you. That's the fun part" },
  { maxN: 2500, name: "Underdogs", flavour: "You'll need a miracle in Istanbul" },
  { maxN: Infinity, name: "Sunday League", flavour: "Great lads, questionable XI" },
] as const;

export type XiTier = (typeof XI_TIERS)[number]["name"];

/** Copy rounding: under 100 nearest 5, 100–1,000 nearest 50, over 1,000 nearest 100. */
export function roundOneIn(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return Infinity;
  if (n < 100) return Math.max(5, Math.round(n / 5) * 5);
  if (n <= 1000) return Math.round(n / 50) * 50;
  return Math.round(n / 100) * 100;
}

/** 3400 -> "3,400" (fixed en format, no locale differences between server and device). */
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export type XiStamp = {
  /** Rounded N, e.g. 250. */
  oneIn: number;
  /** Display form of N, e.g. "3,400". */
  n: string;
  tier: XiTier;
  flavour: string;
  /** Title chance with one decimal, e.g. "12.2". */
  titlePct: string;
};

export function stampFromRatings(r: Ratings): XiStamp {
  const { perfect, title } = xiChances(r);
  const oneIn = roundOneIn(1 / perfect);
  const tier = XI_TIERS.find((t) => oneIn <= t.maxN) ?? XI_TIERS[XI_TIERS.length - 1]!;
  const t = title * 100;
  return { oneIn, n: formatCount(oneIn), tier: tier.name, flavour: tier.flavour, titlePct: t > 0 && t < 0.1 ? "0.1" : t.toFixed(1) };
}

/** The stamp for a drafted XI (any pool: the chances depend only on the XI's team ratings). */
export function xiStamp(squad: Squad): XiStamp {
  return stampFromRatings(teamRatings(squad));
}

/** The dare line (copy-stamp.md §3), same N as the stamp. The one source for the result screen,
 * share text, share image and og image. */
export function xiDare(stamp: Pick<XiStamp, "n">): string {
  return `Can your XI beat 1 in ${stamp.n}?`;
}
