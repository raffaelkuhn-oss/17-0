// Daily replay cookie (v2, no ID). Run: bun scripts/test-daily-cookie.ts
import { readFileSync } from "node:fs";
import { createDailyCookie, dailyPlayedState, verifyDailyCookie, V1_ACCEPT_UNTIL_MS, DAILY_COOKIE_MAX_AGE } from "../src/lib/daily-cookie";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const S = "s3cret", day = "2026-10-18", yesterday = "2026-10-17";
const NOW = Date.UTC(2026, 9, 18, 13, 0); // during the v1 grace
const AFTER = V1_ACCEPT_UNTIL_MS + 1;

// Old-format v1 cookie, built exactly like the previous code did (random 24-hex id).
async function hmac(payload: string, secret = S) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(payload)));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, "0")).join("");
const v1 = `v1.${day}.c.${id}.${await hmac(`v1.${day}.c.${id}`)}`;

const c = (await createDailyCookie(S, { dayKey: day, state: "c" }))!;
const b = (await createDailyCookie(S, { dayKey: day, state: "b" }))!;

// --- no random or unique component
const c2 = (await createDailyCookie(S, { dayKey: day, state: "c" }))!;
t("two players, same Daily + state -> byte-identical cookie", c === c2);
t("format is v2.<day>.<state>.<sig> only (4 parts, no id)", /^v2\.\d{4}-\d{2}-\d{2}\.[cb]\.[A-Za-z0-9_-]{43}$/.test(c) && c.split(".").length === 4);
const many = new Set(await Promise.all(Array.from({ length: 50 }, () => createDailyCookie(S, { dayKey: day, state: "c" }))));
t("50 creations -> 1 distinct value", many.size === 1);
const src = readFileSync("src/lib/daily-cookie.ts", "utf8") + readFileSync("src/lib/daily-cookie.functions.ts", "utf8");
t("no randomness in cookie code (getRandomValues/randomUUID/Math.random)", !/getRandomValues|randomUUID|Math\.random|newCookieId/.test(src));

// --- a finished Daily cannot be replayed
const played = await dailyPlayedState(S, c, day, NOW);
t("finished today (v2) -> played, replay blocked", played.played && played.state === "c" && !played.upgrade);
t("submitted today (v2 'b') -> played", (await dailyPlayedState(S, b, day, NOW)).state === "b");
t("no cookie -> not played", !(await dailyPlayedState(S, undefined, day, NOW)).played);
const route = readFileSync("src/routes/daily.tsx", "utf8");
t("/daily blocks the draft when the cookie says played", /const alreadyPlayed = record !== null \|\| cookiePlayed;/.test(route) && /setCookiePlayed\(r\.played\)/.test(route));
const lb = readFileSync("src/lib/leaderboard.functions.ts", "utf8");
t("leaderboard submit refuses state 'b' (second entry)", /prior\?\.state === "b"/.test(lb));

// --- forged / tampered
t("bad signature rejected", !(await dailyPlayedState(S, c.slice(0, -2) + (c.endsWith("AA") ? "BB" : "AA"), day, NOW)).played);
t("wrong secret rejected", (await verifyDailyCookie("other", c, NOW)) === null);
const forgedDay = c.replace(`.${yesterday}.`, "").replace(day, "2026-10-19");
t("tampered date rejected (signature no longer matches)", (await verifyDailyCookie(S, forgedDay, NOW)) === null);
t("tampered state c->b rejected", (await verifyDailyCookie(S, c.replace(".c.", ".b."), NOW)) === null);
t("forged unsigned v2 rejected", (await verifyDailyCookie(S, `v2.${day}.c.${"A".repeat(43)}`, NOW)) === null);
t("result/extra field appended rejected", (await verifyDailyCookie(S, c + ".17-0", NOW)) === null);
t("garbage / oversize rejected, no throw", (await verifyDailyCookie(S, "a.b", NOW)) === null && (await verifyDailyCookie(S, "v2." + "x".repeat(500), NOW)) === null);
t("bad state letter rejected", (await createDailyCookie(S, { dayKey: day, state: "x" as "c" })) === null);

// --- expired / yesterday
const y = (await createDailyCookie(S, { dayKey: yesterday, state: "b" }))!;
t("yesterday's valid cookie -> not played today (new Daily, new attempt)", !(await dailyPlayedState(S, y, day, NOW)).played);
t("max-age unchanged at 36 h (browser expires it)", DAILY_COOKIE_MAX_AGE === 129600);

// --- old format (v1 with random id)
const lv = await dailyPlayedState(S, v1, day, NOW);
t("v1 cookie for today counts as played (no free replay after deploy)", lv.played && lv.state === "c");
t("v1 cookie is flagged for rewrite to v2", lv.upgrade === true);
t("v1 id is discarded (not returned)", !("id" in ((await verifyDailyCookie(S, v1, NOW)) ?? {})));
t("v1 with bad signature rejected", !(await dailyPlayedState(S, v1.slice(0, -2) + "zz", day, NOW)).played);
t("v1 from yesterday -> not played today", !(await dailyPlayedState(S, v1.replaceAll(day, yesterday), day, NOW)).played);
t("v1 ignored after V1_ACCEPT_UNTIL (all v1 cookies expired by then)", !(await dailyPlayedState(S, v1, day, AFTER)).played);
t("v1 grace ends 21 Oct 2026 00:00 UTC (> 36 h after the 18 Oct deploy)", V1_ACCEPT_UNTIL_MS === Date.UTC(2026, 9, 21));

// --- cookie flags at least as strict as before
const fn = readFileSync("src/lib/daily-cookie.functions.ts", "utf8");
t("flags: HttpOnly, SameSite=Strict, Secure always, path /", /httpOnly: true/.test(fn) && /sameSite: "strict"/.test(fn) && /secure: true/.test(fn) && /path: "\/"/.test(fn));

// --- missing secret
t("missing secret: create -> null", (await createDailyCookie(undefined, { dayKey: day, state: "c" })) === null);
t("missing secret: verify -> null", (await verifyDailyCookie(undefined, c)) === null);
process.exit(fails ? 1 : 0);
