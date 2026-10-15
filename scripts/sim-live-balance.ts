// Balance check for live current players (not in CI). Run: bun scripts/sim-live-balance.ts  (N=20000 default; WORST=1 adds single-swap check)
import { FORMATION, PLAYERS, overall } from "../src/lib/players";
import { simulate } from "../src/lib/sim";
import { buildLivePlayers } from "../src/lib/live/form";
import { CURRENT_PLAYERS } from "../src/lib/live/current-players";
const N = +(process.env.N || 20000);
const pickBest = (pool: any[]) => {
  const xi: any[] = [];
  for (const sl of FORMATION)
    xi.push(
      pool
        .filter((p) => p.roles.includes(sl.role) && !xi.includes(p))
        .sort((a, b) => overall(b) - overall(a))[0],
    );
  return xi;
};
const run = (xi: any[]) => {
  let c = 0,
    p = 0,
    w = 0;
  for (let n = 0; n < N; n++) {
    const g = simulate(xi, n * 7 + 1);
    w += g.won;
    if (g.champion) c++;
    if (g.perfect) p++;
  }
  return `${((c / N) * 100).toFixed(2)}% / ${((p / N) * 100).toFixed(2)}% / ${(w / N).toFixed(2)}`;
};
const defs = CURRENT_PLAYERS;
const live = (f: number) =>
  buildLivePlayers(
    {
      version: 1,
      updatedAt: "",
      windowFrom: "",
      players: Object.fromEntries(
        defs.map((d) => [d.id, { form: f, goals: 0, assists: 0, lastDelta: 0, note: "" }]),
      ),
    },
    defs,
  );
const avg = (xi: any[]) => (xi.reduce((a, p) => a + overall(p), 0) / 11).toFixed(1);
const names = (xi: any[]) =>
  xi.map((p) => p.name.split(" ").pop() + (p.era === "Current" ? "*" : "")).join(",");
for (const f of [-5, 0, 5]) {
  const xi = pickBest(live(f));
  const missing = FORMATION.filter((_, i) => !xi[i]).map((sl) => sl.role);
  if (missing.length) {
    console.log(
      `current best XI form ${f}: no full current-only XI (missing ${missing.join(", ")})`,
    );
    continue;
  }
  console.log(`current best XI form ${f}: ${run(xi)} avg ${avg(xi)}`);
}
const L = pickBest(PLAYERS);
console.log("legends best XI:", run(L), avg(L));
const mix = pickBest([...PLAYERS, ...live(5)]);
console.log("mixed best (pool legends+current@+5):", run(mix), names(mix));
// forced mix: legends XI with every slot where a current player fits replaced by the best current @+5 for that slot
const c5 = live(5);
const forced = L.map((p, i) => {
  const r = FORMATION[i].role;
  return [...c5].filter((c) => c.roles.includes(r)).sort((a, b) => overall(b) - overall(a))[0] ?? p;
});
// half-and-half: back 5 legends? use current for slots 0-5, legends for 6-10
const half = L.map((p, i) => (i < 6 ? forced[i] : p));
const half2 = L.map((p, i) => (i >= 6 ? forced[i] : p));
console.log("mixed: current GK+def+DM, legends front:", run(half));
console.log("mixed: legends back, current front:", run(half2));
if (process.env.WORST) {
  // single swaps
  let worst = 0,
    ws = "";
  for (let i = 0; i < 11; i++) {
    const x = [...L];
    x[i] = forced[i];
    let p = 0;
    for (let n = 0; n < N; n++) if (simulate(x, n * 7 + 1).perfect) p++;
    if (p > worst) {
      worst = p;
      ws = forced[i].name;
    }
  }
  console.log("max single-swap 17-0:", ((worst / N) * 100).toFixed(2), ws);
}
