// "1 in N" XI stamp: exact chances vs the real sim, copy rounding, tiers, share texts (X length), og v3, privacy.
import { FORMATION, PLAYERS, overall } from "../src/lib/players";
import { candidatesFor, simulate, teamRatings, type Campaign, type MatchResult } from "../src/lib/sim";
import { XI_TIERS, formatCount, roundOneIn, stampFromRatings, xiChances, xiStamp, type XiStamp } from "../src/lib/xi-chance";
import { X_LIMIT, shareText, xLength } from "../src/lib/share-text";
import { readFileSync } from "node:fs";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const rf = (s: number) => { let a = s; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };

// 1) Exact closed form == simulate() within sampling noise (guards against sim.ts changes drifting apart).
const best: any[] = [];
for (const sl of FORMATION) best.push(PLAYERS.filter((p) => p.roles.includes(sl.role) && !best.includes(p)).sort((a, b) => overall(b) - overall(a))[0]);
const rng = rf(77);
const drafted = (q: number) => { const seed = Math.floor(rng() * 1e9); const picks: any[] = []; for (let s = 0; s < 11; s++) { const c = candidatesFor(FORMATION[s]!.role, new Set(picks.map((x) => x.id)), 4, rf(seed + s * 7919)); picks.push(rng() < q ? c.reduce((a, b) => (overall(b) > overall(a) ? b : a)) : c[Math.floor(rng() * c.length)]); } return picks; };
for (const [name, xi] of [["best XI", best], ["greedy XI", drafted(1)], ["random XI", drafted(0)]] as const) {
  const e = xiChances(teamRatings(xi));
  const S = 150000;
  let p = 0, c = 0;
  for (let i = 0; i < S; i++) { const g = simulate(xi, (i * 2654435761) >>> 0); if (g.perfect) p++; if (g.champion) c++; }
  const zP = Math.abs(p / S - e.perfect) / Math.sqrt((e.perfect * (1 - e.perfect)) / S);
  const zT = Math.abs(c / S - e.title) / Math.sqrt((e.title * (1 - e.title)) / S);
  t(`${name}: exact 17-0 ${(e.perfect * 100).toFixed(3)}% vs sim ${((p / S) * 100).toFixed(3)}% (z ${zP.toFixed(2)}), title ${(e.title * 100).toFixed(2)}% vs ${((c / S) * 100).toFixed(2)}% (z ${zT.toFixed(2)})`, zP < 4.5 && zT < 4.5);
}
t("best XI ~1 in 80 (sim-stats bestXI 1.23%)", xiStamp(best).oneIn === 80 && xiStamp(best).tier === "Immortals");

// 2) Copy rounding (copy-stamp.md §2) and tiers (§1)
t("rounding <100 nearest 5", roundOneIn(81.2) === 80 && roundOneIn(97.6) === 100 && roundOneIn(3) === 5);
t("rounding 100-1000 nearest 50", roundOneIn(254) === 250 && roundOneIn(389) === 400 && roundOneIn(1000) === 1000);
t("rounding >1000 nearest 100 + comma", roundOneIn(3412) === 3400 && formatCount(3400) === "3,400" && formatCount(1433900) === "1,433,900" && formatCount(250) === "250");
const tierOf = (n: number) => XI_TIERS.find((x) => n <= x.maxN)!.name;
t("tier cut-offs v2", tierOf(200) === "Immortals" && tierOf(250) === "Contenders" && tierOf(450) === "Contenders" && tierOf(500) === "Dark horses" && tierOf(900) === "Dark horses" && tierOf(1000) === "Underdogs" && tierOf(2500) === "Underdogs" && tierOf(2600) === "Sunday League");
t("tier words verbatim", XI_TIERS.map((x) => x.name).join("|") === "Immortals|Contenders|Dark horses|Underdogs|Sunday League");
const weak = stampFromRatings({ attack: 81, midfield: 79, defence: 82, mentality: 87 });
t(`weakest ratings box corner still has a real N (1 in ${weak.n}, ${weak.tier})`, Number.isFinite(weak.oneIn) && weak.tier === "Sunday League");
const t0 = performance.now(); for (let i = 0; i < 2000; i++) xiStamp(best); const us = ((performance.now() - t0) / 2000) * 1000;
t(`stamp is cheap enough for the Worker (${us.toFixed(1)} µs per XI, budget 1000)`, us < 1000);

// 3) Share texts, verbatim, and the X length test at the worst case of every string.
const mk = (o: string, extra: Partial<Campaign> = {}): Campaign => {
  const results = [...o].map((x, i) => ({ round: `R${i}`, opponent: "X", gf: 1, ga: 0, outcome: x as MatchResult["outcome"] }));
  const won = [...o].filter((x) => x === "W").length, drawn = [...o].filter((x) => x === "D").length;
  return { results, won, drawn, lost: o.length - won - drawn, points: 0, eliminatedIn: null, champion: false, perfect: false, ...extra } as Campaign;
};
const O = "https://ucl17-0.com";
const st: XiStamp = { oneIn: 250, n: "250", tier: "Contenders", flavour: "", titlePct: "12.2" };
const mid = mk("WWDWWLWWWWWL", { eliminatedIn: "Quarter-Final" });
const N1 = shareText({ campaign: mid, challengeCode: "abc", origin: O, stamp: st });
t("normal verbatim", N1.full === `9W 1D 2L in 17-0 Draft, out in the QF\n✅✅🟨✅✅❌✅✅✅✅✅❌\nMy XI: Contenders · goes 17-0 about 1 in 250\nCan your XI beat 1 in 250?\n${O}/r/abc`);
const NM = shareText({ campaign: mk("W".repeat(16) + "L", { eliminatedIn: "Final" }), challengeCode: "abc", origin: O, stamp: st });
t("near miss verbatim", NM.body === `16W 0D 1L in 17-0 Draft. One game off perfect 😩\n${"✅".repeat(16)}❌\nMy XI: Contenders · goes 17-0 about 1 in 250\nCan your XI beat 1 in 250?`);
const PF = shareText({ campaign: mk("W".repeat(17), { champion: true, perfect: true }), challengeCode: "abc", origin: O, stamp: st });
t("perfect verbatim", PF.body === `I went 17-0 in 17-0 Draft 🏆\n${"✅".repeat(17)}\nMy XI does that about 1 in 250 seasons. Think you can?`);
const DY = shareText({ campaign: mid, dailyNumber: 8, dailyStreak: 3, origin: O, stamp: st });
t("daily verbatim, /daily link", DY.full === `17-0 Daily #8: 9W 1D 2L · 🔥 3-day streak\n✅✅🟨✅✅❌✅✅✅✅✅❌\nMy XI: Contenders · goes 17-0 about 1 in 250\nSame legends for everyone today. Can you beat it?\n${O}/daily`);
// Daily never carries a result link, even if a code were passed by mistake? (runLink prefers a code, so callers never pass one for Daily.)
t("daily text has no /r/ or ?c= link", !/\/r\/|[?&]c=/.test(DY.full));
t("no 'odds', no hashtags", ![N1, NM, PF, DY].some((x) => /\bodds\b|#[A-Za-z]/i.test(x.full)));
t("X length: emoji 2, URL 23, '…' 2, '·' 1", xLength("✅ https://ucl17-0.com/r/abc") === 2 + 1 + 23 && xLength("…·") === 3 && xLength("🔥") === 2 && xLength("❤️") === 2);
// Worst case: longest tier word, a 10-digit N (no real XI gets near it), 17 grid squares, longest header, 80-char code.
const worstSt: XiStamp = { oneIn: 9_999_999_900, n: "9,999,999,900", tier: "Sunday League", flavour: "", titlePct: "0.1" };
const code80 = "x".repeat(80);
const worst = {
  normal: shareText({ campaign: mk("WDWDWDWDWDWDWDWDL", { eliminatedIn: "Semi-Final" }), challengeCode: code80, origin: O, stamp: worstSt }),
  league: shareText({ campaign: mk("LDLDLDLD", { eliminatedIn: "League Phase" }), challengeCode: code80, origin: O, stamp: worstSt }),
  nearMiss: shareText({ campaign: mk("W".repeat(16) + "L", { eliminatedIn: "Final" }), challengeCode: code80, origin: O, stamp: worstSt }),
  perfect: shareText({ campaign: mk("W".repeat(17), { champion: true, perfect: true }), challengeCode: code80, origin: O, stamp: worstSt }),
  daily: shareText({ campaign: mk("WDWDWDWDWDWDWDWDL", { eliminatedIn: "Final" }), dailyNumber: 99999, dailyStreak: 99999, origin: O, stamp: worstSt }),
};
let max = 0;
for (const [k, v] of Object.entries(worst)) {
  const n = xLength(v.full);
  max = Math.max(max, n);
  console.log(`  worst ${k}: ${n} X chars${v.full.includes("My XI") ? "" : " (no My XI line in this variant)"}`);
}
t(`every share string <= ${X_LIMIT} X chars at its worst case (max ${max})`, max <= X_LIMIT);
t("My XI line kept at the worst case (no drop needed)", Object.values(worst).every((v) => v.full.includes("My XI") || v.full.startsWith("I went 17-0")));
// Drop rule: an over-long text loses the "My XI: …" line first and keeps the dare.
const huge: XiStamp = { ...worstSt, n: "9".repeat(60) };
const dropped = shareText({ campaign: mk("WDWDWDWDWDWDWDWDL", { eliminatedIn: "Final" }), challengeCode: code80, origin: O, stamp: huge });
t("drop rule: My XI line goes first, dare stays", !dropped.full.includes("My XI:") && dropped.full.includes("Can your XI beat"));

// 4) og v3: the Worker recomputes the stamp from the code; nothing about the XI's chance is read from the URL.
const handler = readFileSync("src/lib/og/handler.ts", "utf8");
t("og handler recomputes the stamp from the decoded XI", /xiStamp\(run\.picks\)/.test(handler) && !/searchParams/.test(handler));
process.exit(fails ? 1 : 0);
