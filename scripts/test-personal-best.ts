/**
 * Personal best + saved XI (Option B return-loop prototype):
 * - LocalStorage persistence under `ucl170_personal_best_v1` (device-only, never sent over network)
 * - Deterministic stage + tie-break hierarchy (17-0 > Champions > Final > SF > QF > R16 > Playoff > League Phase)
 * - Strictly-better update rule (worse or identical runs never overwrite)
 * - Graceful handling of SSR, blocked storage, quota errors, and corrupt/malformed JSON
 * - Copy alignment with `/workspace/analytics/17-0-chance/copy-figures.md` ("chance", never "odds")
 * - Component render & integration checks
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { PersonalBestBar } from "../src/components/PersonalBestBar";
import type { StorageLike } from "../src/lib/daily";
import {
  COPY_FIGURES,
  PERSONAL_BEST_KEY,
  PERSONAL_BEST_STAGES,
  buildPersonalBest,
  compactBestLine,
  comparePersonalBest,
  fullBestHeadline,
  isBetterPersonalBest,
  loadPersonalBest,
  normalizePersonalBest,
  savePersonalBest,
  stageRank,
  strategyBenchmarkLine,
  xiChanceLine,
} from "../src/lib/personal-best";
import { FORMATION, PLAYERS, overall, type Player } from "../src/lib/players";
import type { Campaign, MatchResult } from "../src/lib/sim";
import { xiStamp } from "../src/lib/xi-chance";

let fails = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? "PASS " : "FAIL ") + n);
  if (!c) fails++;
};
const safe = (n: string, f: () => void) => {
  try {
    f();
    t(n, true);
  } catch (e) {
    t(`${n} (threw ${(e as Error).message})`, false);
  }
};

class Mem implements StorageLike {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  get length() {
    return this.m.size;
  }
}

const throwingStorage: StorageLike = {
  getItem() {
    throw new DOMException("blocked", "SecurityError");
  },
  setItem() {
    throw new DOMException("blocked", "SecurityError");
  },
  key() {
    throw new DOMException("blocked", "SecurityError");
  },
  get length(): number {
    throw new DOMException("blocked", "SecurityError");
  },
};

class QuotaFullStorage extends Mem {
  override setItem(): void {
    throw new DOMException("full", "QuotaExceededError");
  }
}

const bestXI: Player[] = [];
const weakXI: Player[] = [];
for (const sl of FORMATION) {
  bestXI.push(
    PLAYERS.filter((p) => p.roles.includes(sl.role) && !bestXI.includes(p)).sort(
      (a, b) => overall(b) - overall(a),
    )[0]!,
  );
  weakXI.push(
    PLAYERS.filter((p) => p.roles.includes(sl.role) && !weakXI.includes(p)).sort(
      (a, b) => overall(a) - overall(b),
    )[0]!,
  );
}

const makeCampaign = (
  outcomes: string,
  extra: Partial<Campaign> = {},
  gfPerWin = 2,
): Campaign => {
  const results: MatchResult[] = [...outcomes].map((o, i) => ({
    round: i < 8 ? `League Phase ${i + 1}` : `KO ${i}`,
    opponent: "Opponent",
    gf: o === "W" ? gfPerWin : o === "D" ? 1 : 0,
    ga: o === "L" ? 2 : o === "D" ? 1 : 0,
    outcome: o as MatchResult["outcome"],
  }));
  const won = [...outcomes].filter((x) => x === "W").length;
  const drawn = [...outcomes].filter((x) => x === "D").length;
  const lost = outcomes.length - won - drawn;
  const league = results.slice(0, 8);
  const points = league.reduce((s, m) => s + (m.outcome === "W" ? 3 : m.outcome === "D" ? 1 : 0), 0);
  return {
    results,
    won,
    drawn,
    lost,
    points,
    eliminatedIn: "Quarter-Final",
    champion: false,
    perfect: false,
    ...extra,
  };
};

// 1. First-time visitor & saving first run
{
  const s = new Mem();
  t("first visit: loadPersonalBest is null and writes nothing", loadPersonalBest(s) === null && s.length === 0);
  const qfCamp = makeCampaign("WWDWLWWWWWLL", { eliminatedIn: "Quarter-Final" });
  const r1 = savePersonalBest(qfCamp, bestXI, "classic", s, new Date("2026-10-24T10:00:00Z"));
  t("first finished run saves as personal best", r1.updated === true && r1.best !== null);
  t("stored under versioned key ucl170_personal_best_v1", s.getItem(PERSONAL_BEST_KEY) !== null);
  const loaded = loadPersonalBest(s)!;
  t(
    "stored record has v=1, stage, W/D/L, 11-player XI, and exact xiStamp fields",
    loaded.v === 1 &&
      loaded.stage === "Quarter-Final" &&
      loaded.won === 8 &&
      loaded.drawn === 1 &&
      loaded.lost === 3 &&
      loaded.xi.length === 11 &&
      loaded.oneIn === xiStamp(bestXI).oneIn &&
      loaded.oneInLabel === xiStamp(bestXI).n &&
      loaded.titlePct === xiStamp(bestXI).titlePct &&
      loaded.tier === xiStamp(bestXI).tier,
  );
}

// 2. Stage hierarchy & strictly-better update rules
{
  t(
    "stage hierarchy order: League Phase < Playoff < R16 < QF < SF < Final < Champions < 17-0",
    PERSONAL_BEST_STAGES.every((st, i) => stageRank(st) === i) &&
      PERSONAL_BEST_STAGES.join("|") ===
        "League Phase|Playoff|Round of 16|Quarter-Final|Semi-Final|Final|Champions|17-0",
  );

  const s = new Mem();
  const leagueExit = makeCampaign("LLDLLWDL", { eliminatedIn: "League Phase" });
  const playoffExit = makeCampaign("WWDDLLWDLL", { eliminatedIn: "Playoff" });
  const r16Exit = makeCampaign("WWWDLLWDWWLL", { eliminatedIn: "Round of 16" });
  const qfExit = makeCampaign("WWWWLLWDWWWWLL", { eliminatedIn: "Quarter-Final" });
  const sfExit = makeCampaign("WWWWLLWDWWWWWWLL", { eliminatedIn: "Semi-Final" });
  const finalLoss = makeCampaign("WWWWWWWDWWWWWWWWL", { eliminatedIn: "Final" });
  const champ14 = makeCampaign("WWWWWDLDWWWWWWWWW", { eliminatedIn: null, champion: true, perfect: false });
  const champ15 = makeCampaign("WWWWWWLDWWWWWWWWW", { eliminatedIn: null, champion: true, perfect: false });
  const perfect17 = makeCampaign("W".repeat(17), { eliminatedIn: null, champion: true, perfect: true });

  t("save League Phase first", savePersonalBest(leagueExit, weakXI, "classic", s).updated === true);
  t("Playoff beats League Phase", savePersonalBest(playoffExit, weakXI, "classic", s).updated === true);
  t("League Phase does NOT overwrite Playoff", savePersonalBest(leagueExit, bestXI, "classic", s).updated === false);
  t("Round of 16 beats Playoff", savePersonalBest(r16Exit, weakXI, "classic", s).updated === true);
  t("Quarter-Final beats Round of 16", savePersonalBest(qfExit, weakXI, "classic", s).updated === true);
  t("Semi-Final beats Quarter-Final", savePersonalBest(sfExit, weakXI, "classic", s).updated === true);
  t("Final beats Semi-Final", savePersonalBest(finalLoss, weakXI, "classic", s).updated === true);
  t("Champions beats Final (even with fewer wins: 14W vs 15W)", savePersonalBest(champ14, weakXI, "classic", s).updated === true);
  t("Final does NOT overwrite Champions", savePersonalBest(finalLoss, bestXI, "classic", s).updated === false);
  t("Same stage (Champions): more wins (15W vs 14W) updates best", savePersonalBest(champ15, weakXI, "classic", s).updated === true);
  t("Same stage & same wins: identical run does NOT overwrite", savePersonalBest(champ15, weakXI, "classic", s).updated === false);
  t("Same stage & same W/D/L/pts/GD: stronger XI (bestXI vs weakXI) updates best", savePersonalBest(champ15, bestXI, "classic", s).updated === true);
  t("Same stage & same W/D/L/pts: higher goal difference updates best", savePersonalBest(makeCampaign("WWWWWWLDWWWWWWWWW", { eliminatedIn: null, champion: true }, 4), weakXI, "classic", s).updated === true);
  t("17-0 beats Champions", savePersonalBest(perfect17, weakXI, "classic", s).updated === true && loadPersonalBest(s)?.stage === "17-0");
  t("Champions never overwrites 17-0", savePersonalBest(champ15, bestXI, "classic", s).updated === false && loadPersonalBest(s)?.stage === "17-0");
  t("17-0 with stronger XI (1 in 80 vs weak XI) updates best", savePersonalBest(perfect17, bestXI, "classic", s).updated === true && loadPersonalBest(s)?.oneIn === 80);
}

// 3. Tie-breakers unit check (wins, fewer losses, points, goalDiff, goalsFor, oneIn, squadRating)
{
  const base = buildPersonalBest(makeCampaign("WWWWLLWDWWWWLL", { eliminatedIn: "Quarter-Final" }), weakXI)!;
  const fewerLosses = { ...base, drawn: base.drawn + 1, lost: base.lost - 1 };
  const morePts = { ...base, points: base.points + 2 };
  const betterGd = { ...base, goalDiff: base.goalDiff + 3 };
  const moreGf = { ...base, goalsFor: base.goalsFor + 2 };
  const betterOneIn = { ...base, oneIn: 80 };
  const betterRating = { ...base, squadRating: base.squadRating + 3 };
  t("tie-break: fewer losses wins when stage & wins equal", comparePersonalBest(fewerLosses, base) > 0);
  t("tie-break: more league points wins", comparePersonalBest(morePts, base) > 0);
  t("tie-break: higher goalDiff wins", comparePersonalBest(betterGd, base) > 0);
  t("tie-break: higher goalsFor wins", comparePersonalBest(moreGf, base) > 0);
  t("tie-break: lower oneIn (better 17-0 chance) wins", comparePersonalBest(betterOneIn, base) > 0);
  t("tie-break: higher squadRating wins", comparePersonalBest(betterRating, base) > 0);
  t("isBetterPersonalBest(x, x) is false", !isBetterPersonalBest(base, base));
}

// 4. Corrupt / missing / blocked localStorage & invalid inputs
safe("blocked storage: loadPersonalBest never throws", () => {
  if (loadPersonalBest(throwingStorage) !== null) throw new Error("expected null");
});
safe("blocked storage: savePersonalBest never throws and still returns in-memory best", () => {
  const r = savePersonalBest(makeCampaign("W".repeat(17), { champion: true, perfect: true, eliminatedIn: null }), bestXI, "classic", throwingStorage);
  if (!r.updated || r.best?.stage !== "17-0") throw new Error("bad return");
});
safe("quota exceeded: savePersonalBest never throws", () => {
  const r = savePersonalBest(makeCampaign("W".repeat(17), { champion: true, perfect: true, eliminatedIn: null }), bestXI, "classic", new QuotaFullStorage());
  if (!r.updated || r.best?.stage !== "17-0") throw new Error("bad return");
});
safe("null storage (SSR): load + save work without throwing", () => {
  if (loadPersonalBest(null) !== null) throw new Error("not null");
  const r = savePersonalBest(makeCampaign("W".repeat(17), { champion: true, perfect: true, eliminatedIn: null }), bestXI, "classic", null);
  if (!r.updated || r.best?.stage !== "17-0") throw new Error("bad");
});
t("incomplete picks (<11 players) are ignored", savePersonalBest(makeCampaign("W".repeat(17), { champion: true, perfect: true, eliminatedIn: null }), bestXI.slice(0, 10), "classic", new Mem()).updated === false);

for (const [label, raw] of [
  ["bad JSON", "{not-json"],
  ["null", "null"],
  ["array", "[1,2,3]"],
  ["wrong version", JSON.stringify({ v: 2, stage: "17-0" })],
  ["invalid stage", JSON.stringify({ v: 1, stage: "World Cup", won: 17, drawn: 0, lost: 0, points: 24, goalDiff: 20, goalsFor: 20, squadRating: 90, oneIn: 80, oneInLabel: "80", titlePct: "23.8", tier: "Immortals", xi: [] })],
  ["short XI", JSON.stringify({ v: 1, stage: "17-0", won: 17, drawn: 0, lost: 0, points: 24, goalDiff: 20, goalsFor: 20, squadRating: 90, oneIn: 80, oneInLabel: "80", titlePct: "23.8", tier: "Immortals", xi: [{ slot: "GK", role: "GK", name: "Casillas", short: "Casillas", rating: 92 }] })],
] as const) {
  const s = new Mem();
  s.setItem(PERSONAL_BEST_KEY, raw);
  t(`corrupt localStorage (${label}) -> loadPersonalBest returns null`, loadPersonalBest(s) === null);
  const saved = savePersonalBest(makeCampaign("WWWWLLWDWWWWLL", { eliminatedIn: "Quarter-Final" }), bestXI, "classic", s);
  t(`corrupt localStorage (${label}) -> next save recovers cleanly`, saved.updated === true && loadPersonalBest(s)?.stage === "Quarter-Final");
}
t("normalizePersonalBest(undefined) -> null", normalizePersonalBest(undefined) === null);

// 5. Copy-figures alignment (/workspace/analytics/17-0-chance/copy-figures.md)
{
  const BANNED = /\b(odds|bet|bets|betting|wager\w*|bookmaker\w*|bookie\w*|stake\w*|gambl\w*|jackpot|payout\w*|good XI|best possible XI|3,400)\b/i;
  t(
    "COPY_FIGURES match copy-figures.md single source of truth",
    COPY_FIGURES.goodDraftTitlePct === 12.2 &&
      COPY_FIGURES.goodDraftTitleOneIn === 8 &&
      COPY_FIGURES.goodDraftPerfectOneIn === 250 &&
      COPY_FIGURES.highestRatedTitlePct === 23.8 &&
      COPY_FIGURES.highestRatedPerfectOneIn === 81 &&
      COPY_FIGURES.bestFoundPerfectOneIn === 31 &&
      COPY_FIGURES.randomPerfectOneIn === "3,300" &&
      COPY_FIGURES.randomTitlePct === 2.6,
  );
  for (const st of PERSONAL_BEST_STAGES) {
    const rec = buildPersonalBest(
      makeCampaign(
        st === "17-0" ? "W".repeat(17) : "WWWWWDLDWWWWWWWWW",
        {
          eliminatedIn: st === "17-0" || st === "Champions" ? null : st,
          champion: st === "17-0" || st === "Champions",
          perfect: st === "17-0",
        },
      ),
      bestXI,
    )!;
    const allCopy = [
      compactBestLine(rec),
      fullBestHeadline(rec),
      xiChanceLine(rec),
      strategyBenchmarkLine(rec),
    ].join(" ");
    t(`stage ${st}: copy says "chance" and has no banned/gambling terms`, /chance/.test(allCopy) && !BANNED.test(allCopy));
    t(`stage ${st}: compact line <= 60 chars (${compactBestLine(rec).length}: "${compactBestLine(rec)}")`, compactBestLine(rec).length <= 60);
  }
}

// 6. Component render & privacy/retention checks
{
  t("PersonalBestBar renders nothing when best is null", renderToStaticMarkup(createElement(PersonalBestBar, { best: null })) === "");
  const sample = buildPersonalBest(
    makeCampaign("WWWWWDLDWWWWWWWWW", { eliminatedIn: null, champion: true, perfect: false }),
    bestXI,
  )!;
  const html = renderToStaticMarkup(createElement(PersonalBestBar, { best: sample }));
  t(
    "PersonalBestBar renders compact summary and Saved XI toggle",
    html.includes('data-testid="personal-best"') &&
      html.includes("Your best: Champions · 14W 2D 1L (1 in 80 chance)") &&
      html.includes('data-testid="personal-best-toggle"') &&
      html.includes("Saved XI"),
  );

  const pbSrc = readFileSync(new URL("../src/lib/personal-best.ts", import.meta.url), "utf8");
  const barSrc = readFileSync(new URL("../src/components/PersonalBestBar.tsx", import.meta.url), "utf8");
  t(
    "personal-best modules never send network beacons or touch /e",
    !/fetch\(|sendBeacon|trackEvent/.test(pbSrc) && !/fetch\(|sendBeacon|trackEvent/.test(barSrc),
  );
}

if (fails) {
  console.error(`${fails} failed`);
  process.exit(1);
}
console.log("all personal-best tests passed");
