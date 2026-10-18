// Leaderboard not configured (no Supabase env): the card is hidden completely and nothing is sent to
// the leaderboard backend. Configured: entries still come through unchanged.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readDailyLeaderboard, type LeaderboardDb } from "../src/lib/leaderboard-read";

let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };

// Count every network request made in this process.
let requests = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (...a: Parameters<typeof fetch>) => { requests++; return realFetch(...a); }) as typeof fetch;

// 1. Server side: missing env -> no client, no request.
delete process.env["SUPABASE_URL"];
delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
const { getSupabaseAdmin } = await import("../src/integrations/supabase/client.server");
t("no Supabase env -> no client", getSupabaseAdmin() === null);
process.env["SUPABASE_URL"] = "https://example.supabase.co";
t("only one of the two secrets -> still no client", getSupabaseAdmin() === null);
delete process.env["SUPABASE_URL"];
const off = await readDailyLeaderboard(null, "2026-10-18");
t("not configured -> { enabled: false, entries: [] }", off.enabled === false && off.entries.length === 0);
t("not configured -> zero network requests", requests === 0);

// 2. Configured: same query and result as before.
const calls: string[] = [];
const row = { id: "1", name: "Raf", won: 17, drawn: 0, lost: 0, points: 24, rating: 90, champion: true, perfect: true, eliminated_in: null };
const q = {
  select: (c: string) => (calls.push(`select ${c}`), q),
  eq: (c: string, v: string) => (calls.push(`eq ${c}=${v}`), q),
  order: (c: string, o: { ascending: boolean }) => (calls.push(`order ${c} ${o.ascending ? "asc" : "desc"}`), q),
  limit: (n: number) => (calls.push(`limit ${n}`), Promise.resolve({ data: [row], error: null })),
};
const db: LeaderboardDb = { from: (table) => (calls.push(`from ${table}`), q) };
const on = await readDailyLeaderboard(db, "2026-10-18");
t("configured -> enabled with entries", on.enabled === true && on.entries.length === 1 && on.entries[0]?.name === "Raf");
t("configured -> unchanged query (day filter, trophy/wins/points/created order, limit 100)",
  calls.join(" | ") === "from daily_leaderboard | select id,name,won,drawn,lost,points,rating,champion,perfect,eliminated_in | eq day_key=2026-10-18 | order champion desc | order won desc | order points desc | order created_at asc | limit 100");
const eq2 = {
  select: () => eq2, eq: () => eq2, order: () => eq2,
  limit: () => Promise.resolve({ data: null, error: { message: "relation missing" } }),
};
const errDb: LeaderboardDb = { from: () => eq2 };
const origErr = console.error; console.error = () => {};
t("read error -> treated as not configured (hidden)", (await readDailyLeaderboard(errDb, "2026-10-18")).enabled === false);
console.error = origErr;

// 3. UI: before the server confirms (and when it says not configured) the cards render nothing.
const { DailyLeaderboard } = await import("../src/components/DailyLeaderboard");
const { HomeLeaderboard } = await import("../src/components/HomeLeaderboard");
const origWarn = console.warn; console.warn = () => {}; // no router context in this test
const dailyHtml = renderToStaticMarkup(createElement(DailyLeaderboard, { dayKey: "2026-10-18", record: null }));
const homeHtml = renderToStaticMarkup(createElement(HomeLeaderboard));
console.warn = origWarn;
t("DailyLeaderboard renders nothing until enabled", dailyHtml === "");
t("HomeLeaderboard renders nothing (no section, no padding) until enabled", homeHtml === "");
const src = (f: string) => readFileSync(f, "utf8");
t("no 'not available' / 'coming soon' copy in the leaderboard card", !/not available|coming soon/i.test(src("src/components/DailyLeaderboard.tsx") + src("src/components/HomeLeaderboard.tsx")));
t("DailyLeaderboard hides on anything but enabled === true", /if \(enabled !== true\) return null;/.test(src("src/components/DailyLeaderboard.tsx")));
t("home page has no wrapper section around HomeLeaderboard (no empty gap)", !/<section[^>]*>\s*<HomeLeaderboard \/>/.test(src("src/routes/index.tsx")));
t("HomeLeaderboard owns the #ranking section", /<section id="ranking"/.test(src("src/components/HomeLeaderboard.tsx")));
t("still zero network requests", requests === 0);
globalThis.fetch = realFetch;
process.exit(fails ? 1 : 0);
