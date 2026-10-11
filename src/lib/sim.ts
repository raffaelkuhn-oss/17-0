import {
  FORMATION,
  PLAYERS,
  ROLE_GROUP,
  overall,
  positionOf,
  type Player,
  type Position,
  type Role,
} from "./players";

export type Squad = (Player | null)[];

export type MatchResult = {
  round: string;
  opponent: string;
  gf: number;
  ga: number;
  outcome: "W" | "D" | "L";
  /** Extra note, e.g. penalties. */
  note?: string;
};

export type Campaign = {
  results: MatchResult[];
  won: number;
  drawn: number;
  lost: number;
  points: number;
  /** Round name where the run ended, null when champions. */
  eliminatedIn: string | null;
  champion: boolean;
  perfect: boolean;
};

/** Points needed to finish inside the top 24 of the league phase. */
export const PLAYOFF_CUTOFF = 11;

const LEAGUE_OPPONENTS = [
  "Sparta Praha",
  "Club Brugge",
  "Feyenoord",
  "Atalanta",
  "Benfica",
  "Borussia Dortmund",
  "Internazionale",
  "Bayern München",
];

const KO_ROUNDS = [
  { name: "Playoff", opponent: "Celtic" },
  { name: "Round of 16", opponent: "Atlético Madrid" },
  { name: "Quarter-Final", opponent: "Arsenal" },
  { name: "Semi-Final", opponent: "Manchester City" },
  { name: "Final", opponent: "Real Madrid" },
];

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Position a player occupies given the formation slot they were drafted into. */
function slotPosition(p: Player, index: number): Position {
  const slot = FORMATION[index];
  return slot ? ROLE_GROUP[slot.role] : positionOf(p);
}

export function teamRatings(squad: Squad) {
  // Rate every player by the slot they were drafted into, not their primary role —
  // a winger picked at attacking mid must still count towards the midfield.
  const slotted = squad
    .map((p, i) => (p ? { p, pos: slotPosition(p, i) } : null))
    .filter(Boolean) as { p: Player; pos: Position }[];
  const by = (pos: Position) => slotted.filter((s) => s.pos === pos).map((s) => s.p);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const attack = avg([...by("FWD").map((p) => p.att), ...by("MID").map((p) => p.att * 0.7)]);
  const midfield = avg(by("MID").map((p) => p.tec * 0.6 + p.def * 0.2 + p.att * 0.2));
  const defence = avg([...by("DEF").map((p) => p.def), ...by("GK").map((p) => p.def)]);
  const mentality = avg(slotted.map((s) => s.p.men));
  const rating = avg(slotted.map((s) => overall(s.p)));
  return {
    attack: Math.round(attack),
    midfield: Math.round(midfield),
    defence: Math.round(defence),
    mentality: Math.round(mentality),
    rating: Math.round(rating),
  };
}


function playMatch(
  rnd: () => number,
  r: ReturnType<typeof teamRatings>,
  oppStrength: number,
  clutch: number,
) {
  const attEdge = (r.attack * 0.6 + r.midfield * 0.4 - oppStrength) / 10;
  const defEdge = (r.defence * 0.7 + r.midfield * 0.3 - oppStrength) / 10;
  const gf = poisson(rnd, Math.max(0.25, 1.15 + attEdge * 0.62 + clutch));
  const ga = poisson(rnd, Math.max(0.35, 1.45 - defEdge * 0.55 - clutch));
  return { gf, ga };
}

export function simulate(squad: Squad, seed = Date.now()): Campaign {
  const rnd = mulberry32(seed);
  const r = teamRatings(squad);
  const results: MatchResult[] = [];
  let points = 0;

  // ---- League phase: 8 matches, draws possible ----
  LEAGUE_OPPONENTS.forEach((opponent, i) => {
    const oppStrength = 66 + (i / 7) * 10;
    const { gf, ga } = playMatch(rnd, r, oppStrength, 0);
    const outcome = gf > ga ? "W" : gf === ga ? "D" : "L";
    points += outcome === "W" ? 3 : outcome === "D" ? 1 : 0;
    results.push({ round: `League Phase ${i + 1}`, opponent, gf, ga, outcome });
  });

  const summarise = (eliminatedIn: string | null, champion: boolean): Campaign => {
    const won = results.filter((m) => m.outcome === "W").length;
    const drawn = results.filter((m) => m.outcome === "D").length;
    const lost = results.filter((m) => m.outcome === "L").length;
    return {
      results,
      won,
      drawn,
      lost,
      points,
      eliminatedIn,
      champion,
      perfect: champion && won === results.length,
    };
  };

  if (points < PLAYOFF_CUTOFF) {
    return summarise("League Phase", false);
  }

  // ---- Knockout: two legs per tie, no draws, elimination each round ----
  for (let k = 0; k < KO_ROUNDS.length; k++) {
    const round = KO_ROUNDS[k]!;
    const oppStrength = 87 + k * 3.4;
    const clutch = (r.mentality - 88) / 12;

    if (round.name === "Final") {
      const { gf, ga } = decisive(rnd, r, oppStrength, clutch);
      const outcome = gf > ga ? "W" : "L";
      results.push({ round: "THE FINAL", opponent: round.opponent, gf, ga, outcome });
      if (outcome === "L") return summarise("Final", false);
      return summarise(null, true);
    }

    let agg = 0;
    for (let leg = 1; leg <= 2; leg++) {
      const { gf, ga } = decisive(rnd, r, oppStrength, clutch);
      agg += gf - ga;
      results.push({
        round: `${round.name} · Leg ${leg}`,
        opponent: round.opponent,
        gf,
        ga,
        outcome: gf > ga ? "W" : "L",
      });
    }

    if (agg < 0) return summarise(round.name, false);
    if (agg === 0) {
      // Aggregate level — penalties settle it, mentality decides.
      const shootout = rnd() < 0.5 + (r.mentality - 88) / 100;
      const last = results[results.length - 1]!;
      last.note = shootout ? "won on penalties" : "lost on penalties";
      if (!shootout) return summarise(round.name, false);
    }
  }

  return summarise(null, true);
}

/** A knockout leg always produces a winner — extra time settles level scores. */
function decisive(
  rnd: () => number,
  r: ReturnType<typeof teamRatings>,
  oppStrength: number,
  clutch: number,
) {
  let { gf, ga } = playMatch(rnd, r, oppStrength, clutch);
  while (gf === ga) {
    if (rnd() < 0.5 + (r.mentality - 88) / 90) gf++;
    else ga++;
  }
  return { gf, ga };
}

function poisson(rnd: () => number, lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return Math.min(k - 1, 7);
}

export function candidatesFor(role: Role, taken: Set<string>, count: number, rnd: () => number) {
  const pool = PLAYERS.filter((p) => p.roles.includes(role) && !taken.has(p.id));
  // Fisher-Yates shuffle so the result is identical across server and client engines.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const a = pool[i]!;
    const b = pool[j]!;
    pool[i] = b;
    pool[j] = a;
  }
  return pool.slice(0, count);
}
