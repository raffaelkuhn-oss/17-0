// Run: bun scripts/test-daily-draft.ts
// Daily leaderboard resolution: current pool + today's (versioned) seed only.
import { FORMATION, PLAYERS } from "../src/lib/players";
import { candidatesFor, simulate } from "../src/lib/sim";
import { dailySeed, DAILY_POOL_VERSION } from "../src/lib/daily";
import { resolveDailyDraft, verifyDraft } from "../src/lib/daily-draft";

let fails = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? "PASS " : "FAIL ") + n);
  if (!c) fails++;
};

const dayKey = "2026-10-21";
function rngFactory(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function draftNames(seed: number, pick = 0) {
  const picks: (typeof PLAYERS)[number][] = [];
  for (let step = 0; step < FORMATION.length; step++) {
    const offered = candidatesFor(FORMATION[step]!.role, new Set(picks.map((p) => p.id)), 4, rngFactory(seed + step * 7919), PLAYERS);
    picks.push(offered[(pick + step) % offered.length]!);
  }
  return picks.map((p) => p.name);
}

t("current pool version is v2", DAILY_POOL_VERSION === "v2");
const seed = dailySeed(dayKey);
const names = draftNames(seed);
const r = resolveDailyDraft(names, dayKey);
t("current-pool draft resolves with today's seed and v2", !!r && r.seed === seed && r.version === "v2");
t("picks come from the current pool, in draft order", !!r && r.picks.every((p, i) => PLAYERS.includes(p) && p.name === names[i]));
t("campaign is the current sim of those picks", !!r && JSON.stringify(r.campaign) === JSON.stringify(simulate(r.picks, seed)));
t("other offered choices resolve too", [1, 2, 3].every((k) => !!resolveDailyDraft(draftNames(seed, k), dayKey)));
t("a name not offered is rejected", resolveDailyDraft(["Not A Real Player", ...names.slice(1)], dayKey) === null);
t("a draft for another day is rejected", resolveDailyDraft(names, "2026-10-22") === null);
t("short list is rejected", resolveDailyDraft(names.slice(0, 10), dayKey) === null);
t("verifyDraft defaults to the current pool", JSON.stringify(verifyDraft(names, seed)) === JSON.stringify(r?.picks));

if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
