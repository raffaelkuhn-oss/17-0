/**
 * Daily stats (Mkt #4): localStorage-only, must never break. Covers first-time visitors, no history,
 * corrupt / wrong-typed / old v1 data (migration), blocked storage (private mode), quota errors,
 * streak rules, history cap, local reset time, share text with streak and share length.
 */
import {
  HISTORY_MAX,
  browserStorage,
  countdownLabel,
  currentStreak,
  emptyStats,
  loadDailyResult,
  loadDailyStats,
  localResetTime,
  nextDailyAt,
  normalizeStats,
  saveDailyResult,
  type StorageLike,
} from "../src/lib/daily";
import { shareText, xLength } from "../src/lib/share-text";
import type { Campaign, MatchResult } from "../src/lib/sim";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const safe = (n: string, f: () => void) => { try { f(); t(n, true); } catch (e) { t(`${n} (threw ${(e as Error).message})`, false); } };

class Mem implements StorageLike {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}
const throwing: StorageLike = {
  getItem() { throw new DOMException("blocked", "SecurityError"); },
  setItem() { throw new DOMException("blocked", "SecurityError"); },
  key() { throw new DOMException("blocked", "SecurityError"); },
  get length(): number { throw new DOMException("blocked", "SecurityError"); },
};
class Full extends Mem { override setItem() { throw new DOMException("full", "QuotaExceededError"); } }

const camp = (o: string, extra: Partial<Campaign> = {}): Campaign => {
  const results = [...o].map((x, i) => ({ round: `R${i}`, opponent: "X", gf: 1, ga: 0, outcome: x as MatchResult["outcome"] }));
  const won = [...o].filter((x) => x === "W").length, drawn = [...o].filter((x) => x === "D").length;
  return { results, won, drawn, lost: o.length - won - drawn, points: 0, eliminatedIn: "Quarter-Final", champion: false, perfect: false, ...extra } as Campaign;
};
const qf = camp("WWDWLWWWWWLL");
const champ = camp("W".repeat(16) + "D", { eliminatedIn: null, champion: true });

// 1. First-time visitor / no history
{
  const s = new Mem();
  const st = loadDailyStats(s);
  t("first visit: zeros, empty dist/history", st.played === 0 && st.streak === 0 && st.history.length === 0 && Object.values(st.dist).every((n) => n === 0));
  t("first visit: no stored result", loadDailyResult("2026-10-18", s) === null);
  t("first visit: current streak 0", currentStreak(st, "2026-10-18") === 0 && currentStreak(null, "2026-10-18") === 0);
  t("first visit: loading writes nothing", s.length === 0);
}
// 2. Blocked storage (private mode) and SSR
safe("blocked storage: load stats never throws", () => { const st = loadDailyStats(throwing); if (st.played !== 0) throw new Error("not empty"); });
safe("blocked storage: load result never throws", () => { if (loadDailyResult("2026-10-18", throwing) !== null) throw new Error("not null"); });
safe("blocked storage: save never throws and still returns stats", () => { const r = saveDailyResult(qf, [], "2026-10-18", 80, throwing); if (r.stats.played !== 1 || r.stats.streak !== 1) throw new Error("bad stats"); });
safe("no storage (null / SSR): load + save work", () => { loadDailyStats(null); const r = saveDailyResult(qf, [], "2026-10-18", 80, null); if (r.stats.played !== 1) throw new Error("bad"); });
t("browserStorage() is null without window (SSR / tests)", browserStorage() === null);
{
  const w = globalThis as unknown as { window?: unknown };
  w.window = { get localStorage(): Storage { throw new DOMException("denied", "SecurityError"); } };
  t("browserStorage() is null when localStorage access throws", browserStorage() === null);
  w.window = { localStorage: { setItem() { throw new DOMException("full", "QuotaExceededError"); }, removeItem() {} } };
  t("browserStorage() is null when writes throw (Safari private mode)", browserStorage() === null);
  delete w.window;
}
safe("quota exceeded: save keeps going", () => { const r = saveDailyResult(qf, [], "2026-10-18", 80, new Full()); if (r.stats.played !== 1) throw new Error("bad"); });

// 3. Corrupt / wrong-typed data
for (const [name, raw] of [
  ["not JSON", "{oops"], ["null", "null"], ["array", "[1,2]"], ["string", '"hi"'], ["number", "42"],
  ["wrong types", JSON.stringify({ v: 2, played: "7", streak: -3, bestStreak: NaN, lastKey: "yesterday", dist: "x", history: "y" })],
  ["huge numbers", JSON.stringify({ v: 2, played: 1e308, streak: 5, lastKey: "2026-10-17", dist: { Final: Infinity }, history: [{ key: "bad" }, null, 7] })],
] as const) {
  const s = new Mem(); s.setItem("ucl170:daily:stats", raw);
  safe(`corrupt stats (${name}): load is well-formed`, () => {
    const st = loadDailyStats(s);
    const ok = [st.played, st.streak, st.bestStreak, ...Object.values(st.dist)].every((n) => Number.isFinite(n) && n >= 0) && Array.isArray(st.history) && st.bestStreak >= st.streak;
    if (!ok) throw new Error(JSON.stringify(st));
  });
  safe(`corrupt stats (${name}): save still works`, () => { const r = saveDailyResult(qf, [], "2026-10-18", 80, s); if (r.stats.lastKey !== "2026-10-18") throw new Error("not saved"); });
}
{
  const s = new Mem(); s.setItem("ucl170:daily:2026-10-18", '{"won":"lots"}');
  t("corrupt day record -> null (page falls back to playing)", loadDailyResult("2026-10-18", s) === null);
}

// 4. v1 migration (old format: no "v", no dist/history), rebuilt from stored per-day records
{
  const s = new Mem();
  s.setItem("ucl170:daily:stats", JSON.stringify({ played: 3, titles: 1, perfects: 0, streak: 2, bestStreak: 2, lastKey: "2026-10-17" }));
  s.setItem("ucl170:daily:2026-10-16", JSON.stringify({ key: "2026-10-16", won: 17, drawn: 0, lost: 0, champion: true, perfect: false, eliminatedIn: null, names: [] }));
  s.setItem("ucl170:daily:2026-10-17", JSON.stringify({ key: "2026-10-17", won: 9, drawn: 1, lost: 2, champion: false, perfect: false, eliminatedIn: "Semi-Final", names: [] }));
  s.setItem("ucl170:daily:name", "Raffa"); // leaderboard name key shares the prefix: must be skipped
  const st = loadDailyStats(s);
  t("v1: counters kept", st.played === 3 && st.titles === 1 && st.streak === 2 && st.bestStreak === 2 && st.lastKey === "2026-10-17");
  t("v1: distribution rebuilt from stored days", st.dist.Champions === 1 && st.dist["Semi-Final"] === 1 && st.history.length === 2);
  t("v1: migration persisted as v2", JSON.parse(s.getItem("ucl170:daily:stats")!).v === 2);
  t("v1: streak continues the next day", saveDailyResult(qf, [], "2026-10-18", 80, s).stats.streak === 3);
  const v1NoDays = new Mem(); v1NoDays.setItem("ucl170:daily:stats", JSON.stringify({ played: 5, streak: 1, bestStreak: 4, lastKey: "2026-10-10" }));
  const st2 = loadDailyStats(v1NoDays);
  t("v1 with no day records: counters kept, empty dist", st2.played === 5 && st2.bestStreak === 4 && st2.history.length === 0);
}

// 5. Streak rules
{
  const s = new Mem();
  saveDailyResult(qf, [], "2026-10-16", 80, s);
  saveDailyResult(champ, [], "2026-10-17", 80, s);
  let st = saveDailyResult(qf, [], "2026-10-18", 80, s).stats;
  t("consecutive days: streak 3, best 3", st.streak === 3 && st.bestStreak === 3 && st.played === 3 && st.titles === 1);
  t("same day again: ignored", saveDailyResult(champ, [], "2026-10-18", 80, s).stats.played === 3);
  t("older day (clock went back): ignored", saveDailyResult(champ, [], "2026-10-15", 80, s).stats.played === 3);
  t("current streak today/tomorrow = 3, after a missed day = 0", currentStreak(st, "2026-10-18") === 3 && currentStreak(st, "2026-10-19") === 3 && currentStreak(st, "2026-10-20") === 0);
  st = saveDailyResult(qf, [], "2026-10-21", 80, s).stats;
  t("gap resets streak to 1, best stays 3", st.streak === 1 && st.bestStreak === 3);
  t("distribution counts outcomes", st.dist["Quarter-Final"] === 3 && st.dist.Champions === 1);
  t("month boundary", saveDailyResult(qf, [], "2026-11-01", 80, (() => { const m = new Mem(); saveDailyResult(qf, [], "2026-10-31", 80, m); return m; })()).stats.streak === 2);
}
{
  const s = new Mem();
  let st = emptyStats();
  for (let d = 0; d < HISTORY_MAX + 10; d++) st = saveDailyResult(qf, [], new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10), 80, s).stats;
  t(`history capped at ${HISTORY_MAX}, played keeps counting`, st.history.length === HISTORY_MAX && st.played === HISTORY_MAX + 10 && st.streak === HISTORY_MAX + 10);
}
t("normalizeStats(undefined) is empty", normalizeStats(undefined).played === 0);

// 6. Local reset time (00:00 UTC shown on the visitor's clock)
const now = new Date("2026-10-18T13:30:00Z");
t("next Daily = next 00:00 UTC", nextDailyAt(now).toISOString() === "2026-10-19T00:00:00.000Z");
t("Zurich (CEST, UTC+2) sees 02:00", localResetTime(now, { timeZone: "Europe/Zurich" }) === "02:00");
t("Zurich after DST ends (CET) sees 01:00", localResetTime(new Date("2026-11-02T10:00:00Z"), { timeZone: "Europe/Zurich" }) === "01:00");
t("New York sees 20:00 the evening before", localResetTime(now, { timeZone: "America/New_York" }) === "20:00");
t("bad time zone falls back to 00:00 UTC", localResetTime(now, { timeZone: "Not/AZone" }) === "00:00 UTC");
t("countdown labels", countdownLabel(10.5 * 3600_000) === "10h 30m" && countdownLabel(65_000) === "1m 05s" && countdownLabel(-5) === "0s");

// 7. Share text with streak + length
const O = "https://ucl17-0.com";
const d1 = shareText({ campaign: qf, dailyNumber: 8, dailyStreak: 1, origin: O });
const d3 = shareText({ campaign: qf, dailyNumber: 8, dailyStreak: 3, origin: O });
t("streak 1: no streak in text", d1.body.split("\n")[0] === "17-0 Daily #8: 8W 1D 3L");
t("streak 3: shown on line 1", d3.body.split("\n")[0] === "17-0 Daily #8: 8W 1D 3L · 🔥 3-day streak");
const worst = shareText({ campaign: camp("WDWDWDWDWDWDWDWDL", { eliminatedIn: "Final" }), dailyNumber: 9999, dailyStreak: 9999, origin: O });
const worstLen = xLength(worst.full);
console.log(`Daily share with streak: sample ${xLength(d3.full)}, worst case ${worstLen} of 280`);
t(`Daily share with streak <= 280 (worst ${worstLen})`, worstLen <= 280);
process.exit(fails ? 1 : 0);
