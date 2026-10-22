// Run: bun scripts/test-explainer.ts
import { readFileSync } from "node:fs";
import { STATS, allChancesCopy } from "../src/lib/chances-copy";
let fails = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? "PASS " : "FAIL ") + n);
  if (!c) fails++;
};
const BANNED =
  /\b(odds|bet|bets|betting|wager\w*|bookmaker\w*|bookie\w*|stake\w*|gambl\w*|jackpot|payout\w*)\b/i;
const copy = allChancesCopy();
const page = readFileSync(
  new URL("../src/routes/how-the-chances-work.tsx", import.meta.url),
  "utf8",
);
t("explainer copy has no betting words", !BANNED.test(copy) && !BANNED.test(page));
t("explainer says 'chance'", /chance/.test(copy));
t("stats from harness: random", STATS.random.titlePct === 2.6 && STATS.random.perfectPct === 0.03);
t("stats from harness: greedy", STATS.greedy.titlePct === 12.2 && STATS.greedy.perfectPct === 0.39);
t(
  "stats from harness: best XI",
  STATS.bestXI.titlePct === 23.8 && STATS.bestXI.perfectPct === 1.23,
);
t(
  "numbers appear in copy",
  copy.includes("2.6%") && copy.includes("0.03%") && copy.includes("1.23%"),
);
t(
  "highest-rated XI vs best XI found",
  copy.includes("highest-rated XI (the top-rated legend in each slot)") &&
    copy.includes("about 1 in 31") &&
    !/best possible XI/i.test(copy),
);
// Chance numbers in FAQ / how-it-works / landing copy must come from sim-stats.json (STATS), never typed in.
for (const f of ["how-it-works", "how-the-chances-work", "index", "ucl-simulator", "football-draft-game", "daily-football-game", "82-0-football"]) {
  const src = readFileSync(new URL(`../src/routes/${f}.tsx`, import.meta.url), "utf8");
  t(`${f}: no hard-coded % figures`, !/\b\d+(\.\d+)?%/.test(src));
  t(`${f}: no "best possible XI" claim`, !/best possible XI/i.test(src));
  t(`${f}: no betting words`, !BANNED.test(src.replace(/import[^\n]*\n/g, "")));
}
const sitemap = readFileSync(new URL("../src/routes/sitemap[.]xml.ts", import.meta.url), "utf8");
t("explainer in sitemap", sitemap.includes('"/how-the-chances-work"'));
if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
