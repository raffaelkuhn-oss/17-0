// Headless balance harness using the real sim code. Usage:
//   bun scripts/sim-harness.ts [N=100000] [--write]  (--write regenerates src/lib/sim-stats.json)
//     (env KO_BASE, KO_STEP, MID_W override knobs in-memory;
//   LIVE=1 adds the current players at base ratings, LIVE_FORM=n shifts them all by form n)
import { writeFileSync } from "node:fs";
import { FORMATION, PLAYERS, overall } from "../src/lib/players";
import { SIM_TUNING, candidatesFor, simulate, teamRatings } from "../src/lib/sim";
import { buildLivePlayers } from "../src/lib/live/form";
import { CURRENT_PLAYERS } from "../src/lib/live/current-players";
if (process.env.KO_BASE) SIM_TUNING.KO_BASE = +process.env.KO_BASE;
if (process.env.KO_STEP) SIM_TUNING.KO_STEP = +process.env.KO_STEP;
if (process.env.MID_W) SIM_TUNING.MID_ATTACK_WEIGHT = +process.env.MID_W;
const ARGS = process.argv.slice(2).filter((a) => a !== "--write");
const WRITE = process.argv.includes("--write");
const N = +(ARGS[0] ?? 100000);
const LF = +(process.env.LIVE_FORM ?? 0);
const POOL = process.env.LIVE === "1" ? [...PLAYERS, ...buildLivePlayers({ version: 1, updatedAt: "", windowFrom: "", players: Object.fromEntries(CURRENT_PLAYERS.map((d) => [d.id, { form: LF, goals: 0, assists: 0, lastDelta: 0, note: "" }])) })] : PLAYERS;
const rf = (s: number) => { let a = s; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
let st = 12345; const rng = () => rf(st++)();
function tally(name: string, mk: (i: number) => { picks: any[]; seed: number }) {
  let w = 0, c = 0, p = 0;
  for (let n = 0; n < N; n++) { const { picks, seed } = mk(n); const g = simulate(picks, seed); w += g.won; if (g.champion) c++; if (g.perfect) p++; }
  console.log(`${name.padEnd(8)} avgWins ${(w / N).toFixed(2)}  champ ${((c / N) * 100).toFixed(2)}%  17-0 ${((p / N) * 100).toFixed(3)}%`);
  return { avgWins: +(w / N).toFixed(2), titlePct: +((c / N) * 100).toFixed(1), perfectPct: +((p / N) * 100).toFixed(2) };
}
const draft = (strategy: "random" | "greedy") => (n: number) => {
  const seed = Math.floor(rng() * 1e9); const picks: any[] = [];
  for (let s = 0; s < 11; s++) {
    const c = candidatesFor(FORMATION[s]!.role, new Set(picks.map((x) => x.id)), 4, rf(seed + s * 7919), POOL);
    picks.push(strategy === "greedy" ? c.reduce((a, b) => (overall(b) > overall(a) ? b : a)) : c[Math.floor(rng() * c.length)]);
  }
  return { picks, seed };
};
const best: any[] = [];
for (const sl of FORMATION) best.push(POOL.filter((p) => p.roles.includes(sl.role) && !best.includes(p)).sort((a, b) => overall(b) - overall(a))[0]);
console.log("tuning", JSON.stringify(SIM_TUNING), "bestXI", JSON.stringify(teamRatings(best)));
const stats = { runs: N, random: tally("random", draft("random")), greedy: tally("greedy", draft("greedy")), bestXI: tally("bestXI", (n) => ({ picks: best, seed: n * 7 + 1 })) };
if (WRITE) {
  if (process.env.LIVE || process.env.KO_BASE || process.env.KO_STEP || process.env.MID_W) throw new Error("--write only with default tuning and legends pool");
  writeFileSync(new URL("../src/lib/sim-stats.json", import.meta.url), JSON.stringify(stats, null, 2) + "\n");
  console.log("wrote src/lib/sim-stats.json");
}
