// Global balance table (not in CI). Run: bun scripts/sim-global-balance.ts [N=20000]
// Env KO_BASE / KO_STEP / MID_W / LEAGUE_BASE / LEAGUE_SPAN / FINAL_BONUS override SIM_TUNING in memory.
import { FORMATION, PLAYERS, overall, type Player } from "../src/lib/players";
import { SIM_TUNING, candidatesFor, simulate } from "../src/lib/sim";
import { buildLivePlayers } from "../src/lib/live/form";
import { CURRENT_PLAYERS } from "../src/lib/live/current-players";

const T = SIM_TUNING as Record<string, number>;
for (const [env, key] of [
  ["KO_BASE", "KO_BASE"],
  ["KO_STEP", "KO_STEP"],
  ["MID_W", "MID_ATTACK_WEIGHT"],
  ["LEAGUE_BASE", "LEAGUE_BASE"],
  ["LEAGUE_SPAN", "LEAGUE_SPAN"],
  ["FINAL_BONUS", "FINAL_BONUS"],
] as const) {
  if (process.env[env] !== undefined && key in T) T[key] = +process.env[env]!;
}
const N = +(process.argv[2] ?? 20000);
const rf = (s: number) => {
  let a = s;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const pickBest = (pool: readonly Player[]) => {
  const xi: Player[] = [];
  for (const sl of FORMATION) {
    const p = pool
      .filter((x) => x.roles.includes(sl.role) && !xi.includes(x))
      .sort((a, b) => overall(b) - overall(a))[0];
    if (!p) return null;
    xi.push(p);
  }
  return xi;
};
const pct = (x: number) => `${((x / N) * 100).toFixed(2)}%`;
function row(name: string, mk: (n: number) => { xi: Player[]; seed: number }) {
  let fin = 0,
    title = 0,
    perfect = 0;
  for (let n = 0; n < N; n++) {
    const { xi, seed } = mk(n);
    const g = simulate(xi, seed);
    if (g.champion || g.eliminatedIn === "Final") fin++;
    if (g.champion) title++;
    if (g.perfect) perfect++;
  }
  console.log(`| ${name} | ${pct(fin)} | ${pct(title)} | ${pct(perfect)} |`);
}
let st = 12345;
const rng = () => rf(st++)();
const draft = (greedy: boolean) => () => {
  const seed = Math.floor(rng() * 1e9);
  const xi: Player[] = [];
  for (let s = 0; s < 11; s++) {
    const c = candidatesFor(
      FORMATION[s]!.role,
      new Set(xi.map((x) => x.id)),
      4,
      rf(seed + s * 7919),
      PLAYERS,
    );
    xi.push(
      greedy
        ? c.reduce((a, b) => (overall(b) > overall(a) ? b : a))
        : c[Math.floor(rng() * c.length)]!,
    );
  }
  return { xi, seed };
};
const live = (f: number) =>
  buildLivePlayers({
    version: 1,
    updatedAt: "",
    windowFrom: "",
    players: Object.fromEntries(
      CURRENT_PLAYERS.map((d) => [d.id, { form: f, goals: 0, assists: 0, lastDelta: 0, note: "" }]),
    ),
  });
console.log(
  `tuning ${JSON.stringify(SIM_TUNING)} · legends ${PLAYERS.length} · live ${CURRENT_PLAYERS.length} · N ${N}`,
);
console.log("| XI | Final reached | Title | 17-0 |\n|---|---|---|---|");
row("Legends random", draft(false));
row("Legends good (greedy)", draft(true));
const best = pickBest(PLAYERS)!;
row("Legends best XI", (n) => ({ xi: best, seed: n * 7 + 1 }));
for (const f of [-5, 0, 5]) {
  const xi = pickBest(live(f));
  if (!xi) console.log(`| Current form ${f} | no full XI | | |`);
  else row(`Current best XI, form ${f > 0 ? "+" : ""}${f}`, (n) => ({ xi, seed: n * 7 + 1 }));
}
const mix = pickBest([...PLAYERS, ...live(5)])!;
row(`Best mixed XI (+5) [${mix.filter((p) => p.live).length} current]`, (n) => ({
  xi: mix,
  seed: n * 7 + 1,
}));
