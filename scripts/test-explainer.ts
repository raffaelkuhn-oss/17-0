// Run: bun scripts/test-explainer.ts
import { readFileSync } from "node:fs";
import { STATS, allChancesCopy } from "../src/lib/chances-copy";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const BANNED = /\b(odds|bet|bets|betting|wager\w*|bookmaker\w*|bookie\w*|stake\w*|gambl\w*|jackpot|payout\w*)\b/i;
const copy = allChancesCopy();
const page = readFileSync(new URL("../src/routes/how-the-chances-work.tsx", import.meta.url), "utf8");
t("explainer copy has no betting words", !BANNED.test(copy) && !BANNED.test(page));
t("explainer says 'chance'", /chance/.test(copy));
t("stats from harness: random", STATS.random.titlePct === 29.9 && STATS.random.perfectPct === 0.68);
t("stats from harness: greedy", STATS.greedy.titlePct === 55.9 && STATS.greedy.perfectPct === 3.34);
t("stats from harness: best XI", STATS.bestXI.titlePct === 70.3 && STATS.bestXI.perfectPct === 5.89);
t("numbers appear in copy", copy.includes("29.9%") && copy.includes("0.68%") && copy.includes("5.89%"));
const sitemap = readFileSync(new URL("../src/routes/sitemap[.]xml.ts", import.meta.url), "utf8");
t("explainer in sitemap", sitemap.includes('"/how-the-chances-work"'));
if (fails) { console.log(`${fails} failed`); process.exit(1); }
