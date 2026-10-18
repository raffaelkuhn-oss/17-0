// "Can your XI beat 1 in N?" on the result screen, just above Share result (PM follow-up, 18 Oct).
// Renders the real ShareButton (used by the draft result screen and the Daily result) and checks
// the line, its N (same rounding as the stamp) and its position; and that the copy lives in one helper.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { FORMATION, PLAYERS, overall } from "../src/lib/players";
import { simulate } from "../src/lib/sim";
import { roundOneIn, formatCount, xiChances, xiDare, xiStamp } from "../src/lib/xi-chance";
import { teamRatings } from "../src/lib/sim";
import { ShareButton } from "../src/components/ShareCard";
import { XiDareLine } from "../src/components/XiStamp";

let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const best: any[] = [];
for (const sl of FORMATION) best.push(PLAYERS.filter((p) => p.roles.includes(sl.role) && !best.includes(p)).sort((a, b) => overall(b) - overall(a))[0]);
const worst: any[] = [];
for (const sl of FORMATION) worst.push(PLAYERS.filter((p) => p.roles.includes(sl.role) && !worst.includes(p)).sort((a, b) => overall(a) - overall(b))[0]);

t("xiDare copy (copy-stamp.md §3)", xiDare({ n: "1,400" }) === "Can your XI beat 1 in 1,400?");

for (const [name, xi] of [["best XI", best], ["weakest XI", worst]] as const) {
  const st = xiStamp(xi);
  const expectedN = formatCount(roundOneIn(1 / xiChances(teamRatings(xi)).perfect));
  t(`${name}: stamp N uses the copy rounding (${expectedN})`, st.n === expectedN);
  const campaign = simulate(xi, 12345);
  const html = renderToStaticMarkup(createElement(ShareButton, { campaign, picks: xi, challengeCode: "abc" }));
  const line = `<p class="mb-3 text-lg font-extrabold text-white" data-testid="xi-dare">${esc(`Can your XI beat 1 in ${st.n}?`)}</p>`;
  t(`${name}: result screen shows "Can your XI beat 1 in ${st.n}?"`, html.includes(line));
  t(`${name}: the line sits just above Share result`, html.indexOf('data-testid="xi-dare"') >= 0 && html.indexOf('data-testid="xi-dare"') < html.indexOf('data-testid="share-primary"') && !/data-testid="xi-dare"[\s\S]*<(a|button)[^>]*>[\s\S]*data-testid="share-primary"/.test(html));
  const daily = renderToStaticMarkup(createElement(ShareButton, { campaign, picks: xi, dailyNumber: 42, dailyStreak: 3, trackMode: "daily" }));
  t(`${name}: Daily result shows the same line`, daily.includes(line));
  t(`${name}: Daily render has no link (no href, no /r/)`, !/href=|\/r\//.test(daily));
}
const noPicks = renderToStaticMarkup(createElement(ShareButton, { campaign: simulate(best, 1) }));
t("no picks (old saved Daily record): no dare line, Share result still there", !noPicks.includes("xi-dare") && noPicks.includes("share-primary"));
t("XiDareLine renders the helper text", renderToStaticMarkup(createElement(XiDareLine, { stamp: { n: "250" } })).includes("Can your XI beat 1 in 250?"));

// The copy lives in one place: no other source file spells the dare out.
for (const f of ["src/lib/share-text.ts", "src/lib/share-image.ts", "src/lib/og/run-image.ts", "src/components/XiStamp.tsx", "src/components/ShareCard.tsx", "src/components/DraftGame.tsx"]) {
  t(`${f}: uses xiDare, no copy of the string`, !readFileSync(new URL(`../${f}`, import.meta.url), "utf8").includes("Can your XI beat 1 in"));
}
if (fails) { console.error(`${fails} failed`); process.exit(1); }
console.log("all dare-line tests passed");
