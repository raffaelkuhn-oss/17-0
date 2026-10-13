// Run: bun scripts/test-live.ts   (fixture-based; no API key or network needed)
import scorersFx from "./fixtures/fd-cl-scorers.json";
import matchesFx from "./fixtures/fd-cl-matches.json";
import { buildLivePlayers, computeWeeklyForm, isLiveEnabled, nextForm, type FdMatch, type FdScorer, type FormState } from "../src/lib/live/form";
import { CURRENT_PLAYERS } from "../src/lib/live/current-players";
import { KV_CURRENT, KV_PREVIOUS, runWeeklyUpdate } from "../src/lib/live/update";
import { FORMATION, PLAYERS, overall } from "../src/lib/players";
import { candidatesFor, simulate } from "../src/lib/sim";
import { dailySeed } from "../src/lib/daily";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const scorers = scorersFx.scorers as unknown as FdScorer[];
const matches = matchesFx.matches as unknown as FdMatch[];
const now = new Date("2026-10-15T04:00:00Z");

// formula
t("spec example: 0.7*2 + 1 + 0.5 + 0.5 = 3.4 -> 3", nextForm(2, 1 + 0.5 + 0.5) === 3);
t("weekly cap +3", nextForm(0, 10) === 3 && nextForm(0, -10) === -3);
t("total clamp +5/-5", nextForm(5, 3) === 5 && nextForm(-5, -3) === -5);
t("decay toward 0 with no events", nextForm(4, 0) === 3 && nextForm(-4, 0) === -3);
t("deterministic", nextForm(1.3, 0.75) === nextForm(1.3, 0.75));

// first run = baseline (no goal deltas), team results still count
const s1 = computeWeeklyForm(null, scorers, matches, now, "2026-10-08");
t("first run: Lautaro baseline goals 4", s1.players["cur-lautaro"]!.goals === 4);
t("first run: Lautaro form = round(0+0.5 win) -> 1 (Math.round .5 up)", s1.players["cur-lautaro"]!.form === 1);
t("first run: Yamal loss -> -0.5 -> round = 0 (-0)", s1.players["cur-yamal"]!.form === 0);
t("GK clean sheet: Raya draw 0-0 -> +1", s1.players["cur-raya"]!.form === 1);
t("GK clean sheet: Donnarumma away win 1-0 -> +1.5 -> 2", s1.players["cur-donnarumma"]!.form === 2);
t("unmatched scorer ignored", !Object.values(s1.players).some((p) => p.goals === 5));
t("all players present", Object.keys(s1.players).length === CURRENT_PLAYERS.length);

// second run with goal deltas
const sc2 = scorers.map((s) => (s.player.id === 9001 ? { ...s, goals: 6, assists: 2 } : s));
const s2 = computeWeeklyForm(s1, sc2, matches, now, "2026-10-15");
// Lautaro: 0.7*1 + 2 goals*1 + 1 assist*0.5 + win 0.5 = 3.7 -> 4, capped at prev+3 = 4
t("delta goals/assists + cap: Lautaro -> 4", s2.players["cur-lautaro"]!.form === 4 && s2.players["cur-lautaro"]!.note.includes("2 goals"));
const s3 = computeWeeklyForm(s2, sc2.map((s) => ({ ...s, goals: 0 })), [], now, "2026-10-22");
t("data correction (lower totals) never gives negative goals", s3.players["cur-lautaro"]!.form === 3);

// build players
const base = buildLivePlayers(null);
t("no state -> base ratings, form 0", base.every((p) => p.live!.form === 0 && overall(p) === p.live!.base));
t("ids unique & never collide with legends", new Set([...PLAYERS, ...base].map((p) => p.id)).size === PLAYERS.length + base.length);
t("names do not duplicate legends", !base.some((b) => PLAYERS.some((p) => p.name === b.name)));
const hot = buildLivePlayers(s2).find((p) => p.id === "cur-lautaro")!;
t("form shifts effective overall by ~form", Math.abs(overall(hot) - (hot.live!.base + 4)) <= 1);
const evil = buildLivePlayers({ ...s2, players: { "cur-lautaro": { ...s2.players["cur-lautaro"]!, form: 99 } } }).find((p) => p.id === "cur-lautaro")!;
t("stored form clamped to 5 on read", evil.live!.form === 5);
t("every formation role has >=1 current player", FORMATION.every((f) => base.some((p) => p.roles.includes(f.role))));

// flags
t("flag off by default", !isLiveEnabled({}, false) && !isLiveEnabled({}, true));
t("?live=1 ignored without preview switch", !isLiveEnabled({ LIVE_PLAYERS_PREVIEW: "0" }, true));
t("preview switch needs ?live=1", !isLiveEnabled({ LIVE_PLAYERS_PREVIEW: "1" }, false) && isLiveEnabled({ LIVE_PLAYERS_PREVIEW: "1" }, true));
t("prod switch", isLiveEnabled({ LIVE_PLAYERS_ENABLED: "1" }, false));

// fetch / KV with mocks
const store = new Map<string, string>();
const kv = { get: async (k: string) => (store.has(k) ? JSON.parse(store.get(k)!) : null), put: async (k: string, v: string) => void store.set(k, v) };
const calls: { url: string; token: string | null }[] = [];
const mockFetch = (async (url: string, init?: RequestInit) => {
  calls.push({ url, token: new Headers(init?.headers).get("X-Auth-Token") });
  return new Response(JSON.stringify(url.includes("/scorers") ? scorersFx : matchesFx), { status: 200 });
}) as unknown as typeof fetch;
t("no key -> no fetch", (await runWeeklyUpdate({ LIVE_FORM: kv }, mockFetch, now)).ok === false && calls.length === 0);
t("no KV -> no fetch", (await runWeeklyUpdate({ FOOTBALL_DATA_API_KEY: "k" }, mockFetch, now)).ok === false && calls.length === 0);
const r1 = await runWeeklyUpdate({ FOOTBALL_DATA_API_KEY: "test-key", LIVE_FORM: kv }, mockFetch, now);
t("run ok, 2 requests (<10/min)", r1.ok && calls.length === 2);
t("auth header + CL endpoints", calls.every((c) => c.token === "test-key") && calls[0]!.url.endsWith("/competitions/CL/scorers?limit=100") && calls[1]!.url.includes("/competitions/CL/matches?status=FINISHED&dateFrom=2026-10-08&dateTo=2026-10-15"));
t("KV written", (JSON.parse(store.get(KV_CURRENT)!) as FormState).players["cur-lautaro"]!.goals === 4);
await runWeeklyUpdate({ FOOTBALL_DATA_API_KEY: "test-key", LIVE_FORM: kv }, mockFetch, new Date("2026-10-22T04:00:00Z"));
t("previous version kept for rollback", store.has(KV_PREVIOUS) && calls[3]!.url.includes("dateFrom=2026-10-15"));
const before = store.get(KV_CURRENT);
const failFetch = (async () => new Response("rate limited", { status: 429 })) as unknown as typeof fetch;
const rf = await runWeeklyUpdate({ FOOTBALL_DATA_API_KEY: "k", LIVE_FORM: kv }, failFetch, now);
t("HTTP 429 -> keeps last ratings", !rf.ok && store.get(KV_CURRENT) === before);
const throwFetch = (async () => { throw new Error("network"); }) as unknown as typeof fetch;
t("network error -> no throw, keeps ratings", !(await runWeeklyUpdate({ FOOTBALL_DATA_API_KEY: "k", LIVE_FORM: kv }, throwFetch, now)).ok && store.get(KV_CURRENT) === before);

// determinism with flag off: default pool === legends
const rng = (seed: number) => { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
let same = true;
for (let d = 0; d < 365; d++) {
  const seed = dailySeed(new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10));
  const a: string[] = [], b: string[] = [];
  for (let s = 0; s < 11; s++) {
    a.push(...candidatesFor(FORMATION[s]!.role, new Set(), 4, rng(seed + s * 7919)).map((p) => p.id));
    b.push(...candidatesFor(FORMATION[s]!.role, new Set(), 4, rng(seed + s * 7919), PLAYERS).map((p) => p.id));
  }
  if (a.join() !== b.join() || a.some((id) => id.startsWith("cur-"))) same = false;
}
t("365 daily seeds: default pool identical to legends-only, no current players", same);
process.exit(fails ? 1 : 0);
