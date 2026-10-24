/**
 * On-device personal best + saved XI (Option B return-loop prototype).
 *
 * Stored in browser localStorage only under `ucl170_personal_best_v1`; nothing is ever sent to
 * the server. Return-visit cohort measurement is already covered by `return_d1` and `return_d7`
 * (and `visit`/`draft_start`/`sim_complete` bucketed by `d1`/`d2-6`/`d7`/`d8+`) in
 * `src/lib/retention.ts`, so no new network event is fired and the live privacy footer needs
 * no event-list change.
 *
 * Copy figures are aligned with `/workspace/analytics/17-0-chance/copy-figures.md` and
 * `src/lib/chances-copy.ts` ("chance", never "odds").
 */
import { BEST_FOUND_XI_ONE_IN, STATS } from "./chances-copy";
import {
  OUTCOMES,
  OUTCOME_LABEL,
  browserStorage,
  outcomeOf,
  type Outcome,
  type StorageLike,
} from "./daily";
import { FORMATION, overall, type Player } from "./players";
import { recordHeadline } from "./record";
import { shortName } from "./short-name";
import { teamRatings, type Campaign } from "./sim";
import { XI_TIERS, xiStamp, type XiTier } from "./xi-chance";

export const PERSONAL_BEST_KEY = "ucl170_personal_best_v1";

export type PersonalBestStage = Outcome;
export const PERSONAL_BEST_STAGES: readonly PersonalBestStage[] = OUTCOMES;

/** Compact stage labels so the single-line summary fits a 375px mobile viewport without wrapping. */
export const STAGE_SHORT_LABEL: Record<PersonalBestStage, string> = {
  "League Phase": "League",
  Playoff: "Play-off",
  "Round of 16": "Last 16",
  "Quarter-Final": "QF",
  "Semi-Final": "SF",
  Final: "Final",
  Champions: "Champions",
  "17-0": "17-0",
};

/** Verified strategy figures from `/workspace/analytics/17-0-chance/copy-figures.md`. */
export const COPY_FIGURES = {
  goodDraftPerfectOneIn: 250,
  goodDraftTitleOneIn: 8,
  goodDraftTitlePct: STATS.greedy.titlePct,
  goodDraftPerfectPct: STATS.greedy.perfectPct,
  highestRatedPerfectOneIn: 81,
  highestRatedTitleOneIn: 4,
  highestRatedTitlePct: STATS.bestXI.titlePct,
  highestRatedPerfectPct: STATS.bestXI.perfectPct,
  bestFoundPerfectOneIn: BEST_FOUND_XI_ONE_IN,
  randomPerfectOneIn: "3,300",
  randomTitleOneIn: 38,
  randomTitlePct: STATS.random.titlePct,
  randomPerfectPct: STATS.random.perfectPct,
} as const;

export type PersonalBestPlayer = {
  slot: string;
  role: string;
  name: string;
  short: string;
  rating: number;
};

export type PersonalBestMode = "classic" | "legend" | "daily";

export type PersonalBestRecord = {
  v: 1;
  stage: PersonalBestStage;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalDiff: number;
  goalsFor: number;
  champion: boolean;
  perfect: boolean;
  eliminatedIn: string | null;
  squadRating: number;
  /** Exact per-XI rounded 17-0 N from `xiStamp()` (lower = stronger 17-0 chance). */
  oneIn: number;
  /** Formatted N with comma thousands separator, e.g. "250" or "1,400". */
  oneInLabel: string;
  /** Exact per-XI title chance % with one decimal, e.g. "12.2". */
  titlePct: string;
  tier: XiTier;
  xi: PersonalBestPlayer[];
  mode: PersonalBestMode;
  savedAt: string;
};

/**
 * Deterministic tournament stage rank:
 * 17-0 (7) > Champions (6) > Final (5) > Semi-Final (4) > Quarter-Final (3) >
 * Round of 16 (2) > Playoff (1) > League Phase (0).
 */
export function stageRank(stage: PersonalBestStage): number {
  const idx = (OUTCOMES as readonly string[]).indexOf(stage);
  return idx >= 0 ? idx : 0;
}

/**
 * Compares two personal-best records (`> 0` means `a` is strictly better than `b`):
 * 1. Tournament stage rank (17-0 > Champions > Final > SF > QF > R16 > Playoff > League Phase)
 * 2. More wins
 * 3. Fewer losses
 * 4. More league-phase points
 * 5. Better total goal difference
 * 6. More total goals scored
 * 7. Better XI 17-0 chance (lower `oneIn`)
 * 8. Higher squad rating
 */
export function comparePersonalBest(a: PersonalBestRecord, b: PersonalBestRecord): number {
  const dStage = stageRank(a.stage) - stageRank(b.stage);
  if (dStage !== 0) return dStage;
  if (a.won !== b.won) return a.won - b.won;
  if (a.lost !== b.lost) return b.lost - a.lost;
  if (a.points !== b.points) return a.points - b.points;
  if (a.goalDiff !== b.goalDiff) return a.goalDiff - b.goalDiff;
  if (a.goalsFor !== b.goalsFor) return a.goalsFor - b.goalsFor;
  if (a.oneIn !== b.oneIn) return b.oneIn - a.oneIn;
  return a.squadRating - b.squadRating;
}

export function isBetterPersonalBest(
  candidate: PersonalBestRecord,
  existing: PersonalBestRecord | null,
): boolean {
  return existing === null || comparePersonalBest(candidate, existing) > 0;
}

export function buildPersonalBest(
  campaign: Campaign,
  picks: readonly Player[],
  mode: PersonalBestMode = "classic",
  now = new Date(),
): PersonalBestRecord | null {
  if (!Array.isArray(picks) || picks.length !== 11 || picks.some((p) => !p || typeof p.name !== "string")) {
    return null;
  }
  const squad = [...picks];
  const r = teamRatings(squad);
  const stamp = xiStamp(squad);
  const stage = outcomeOf(campaign);
  let goalsFor = 0;
  let goalDiff = 0;
  for (const m of campaign.results ?? []) {
    goalsFor += m.gf;
    goalDiff += m.gf - m.ga;
  }
  const xi: PersonalBestPlayer[] = squad.map((p, i) => {
    const slot = FORMATION[i];
    return {
      slot: slot?.label ?? `Slot ${i + 1}`,
      role: slot?.role ?? p.roles[0] ?? "MID",
      name: p.name,
      short: shortName(p),
      rating: overall(p),
    };
  });
  return {
    v: 1,
    stage,
    won: campaign.won,
    drawn: campaign.drawn,
    lost: campaign.lost,
    points: campaign.points,
    goalDiff,
    goalsFor,
    champion: campaign.champion,
    perfect: campaign.perfect,
    eliminatedIn: campaign.eliminatedIn,
    squadRating: r.rating,
    oneIn: stamp.oneIn,
    oneInLabel: stamp.n,
    titlePct: stamp.titlePct,
    tier: stamp.tier,
    xi,
    mode,
    savedAt: now.toISOString().slice(0, 10),
  };
}

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

const isIntIn = (x: unknown, min: number, max: number): x is number =>
  typeof x === "number" && Number.isFinite(x) && Number.isInteger(x) && x >= min && x <= max;

const TIER_NAMES: readonly string[] = XI_TIERS.map((t) => t.name);
const VALID_MODES: readonly string[] = ["classic", "legend", "daily"];

/** Validates a stored value from localStorage; returns null on any corrupt or malformed data. */
export function normalizePersonalBest(raw: unknown): PersonalBestRecord | null {
  if (!isObj(raw) || raw["v"] !== 1) return null;
  const stage = raw["stage"];
  if (typeof stage !== "string" || !(OUTCOMES as readonly string[]).includes(stage)) return null;
  if (!isIntIn(raw["won"], 0, 17) || !isIntIn(raw["drawn"], 0, 17) || !isIntIn(raw["lost"], 0, 17)) {
    return null;
  }
  if (!isIntIn(raw["points"], 0, 24)) return null;
  if (!isIntIn(raw["goalDiff"], -200, 200) || !isIntIn(raw["goalsFor"], 0, 200)) return null;
  if (!isIntIn(raw["squadRating"], 1, 99)) return null;
  const oneIn = raw["oneIn"];
  if (typeof oneIn !== "number" || !Number.isFinite(oneIn) || oneIn <= 0) return null;
  const oneInLabel = raw["oneInLabel"];
  if (typeof oneInLabel !== "string" || !/^\d[\d,]*$/.test(oneInLabel)) return null;
  const titlePct = raw["titlePct"];
  if (typeof titlePct !== "string" || !/^\d+(\.\d+)?$/.test(titlePct)) return null;
  const tier = raw["tier"];
  if (typeof tier !== "string" || !TIER_NAMES.includes(tier)) return null;
  if (!Array.isArray(raw["xi"]) || raw["xi"].length !== 11) return null;
  const xi: PersonalBestPlayer[] = [];
  for (const item of raw["xi"]) {
    if (!isObj(item)) return null;
    if (
      typeof item["slot"] !== "string" ||
      !item["slot"] ||
      typeof item["role"] !== "string" ||
      !item["role"] ||
      typeof item["name"] !== "string" ||
      !item["name"] ||
      typeof item["short"] !== "string" ||
      !item["short"] ||
      !isIntIn(item["rating"], 1, 99)
    ) {
      return null;
    }
    xi.push({
      slot: item["slot"],
      role: item["role"],
      name: item["name"],
      short: item["short"],
      rating: item["rating"],
    });
  }
  const mode = typeof raw["mode"] === "string" && VALID_MODES.includes(raw["mode"])
    ? (raw["mode"] as PersonalBestMode)
    : "classic";
  const savedAt =
    typeof raw["savedAt"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw["savedAt"])
      ? raw["savedAt"]
      : "2026-10-24";
  return {
    v: 1,
    stage: stage as PersonalBestStage,
    won: raw["won"],
    drawn: raw["drawn"],
    lost: raw["lost"],
    points: raw["points"],
    goalDiff: raw["goalDiff"],
    goalsFor: raw["goalsFor"],
    champion: raw["champion"] === true,
    perfect: raw["perfect"] === true,
    eliminatedIn: typeof raw["eliminatedIn"] === "string" ? raw["eliminatedIn"] : null,
    squadRating: raw["squadRating"],
    oneIn,
    oneInLabel,
    titlePct,
    tier: tier as XiTier,
    xi,
    mode,
    savedAt,
  };
}

export function loadPersonalBest(
  storage: StorageLike | null = browserStorage(),
): PersonalBestRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PERSONAL_BEST_KEY);
    return raw ? normalizePersonalBest(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function savePersonalBest(
  campaign: Campaign,
  picks: readonly Player[],
  mode: PersonalBestMode = "classic",
  storage: StorageLike | null = browserStorage(),
  now = new Date(),
): { best: PersonalBestRecord | null; updated: boolean } {
  const existing = loadPersonalBest(storage);
  const candidate = buildPersonalBest(campaign, picks, mode, now);
  if (!candidate) return { best: existing, updated: false };
  if (!isBetterPersonalBest(candidate, existing)) {
    return { best: existing, updated: false };
  }
  if (storage) {
    try {
      storage.setItem(PERSONAL_BEST_KEY, JSON.stringify(candidate));
    } catch {
      /* quota exceeded / blocked storage: still return in-memory best */
    }
  }
  return { best: candidate, updated: true };
}

/**
 * Compact single-line summary for the start screen (fits a 375px mobile viewport alongside the
 * "Saved XI" disclosure trigger). Uses "chance", never "odds".
 */
export function compactBestLine(best: PersonalBestRecord): string {
  if (best.stage === "17-0") {
    return `Your best: 17-0 (1 in ${best.oneInLabel} chance)`;
  }
  return `Your best: ${STAGE_SHORT_LABEL[best.stage]} · ${recordHeadline(best)} (1 in ${best.oneInLabel} chance)`;
}

/** Full stage + record headline for the expanded Saved XI disclosure panel. */
export function fullBestHeadline(best: PersonalBestRecord): string {
  if (best.stage === "17-0") return `17-0 · Perfect campaign (Squad ${best.squadRating})`;
  return `${OUTCOME_LABEL[best.stage]} · ${recordHeadline(best)} (Squad ${best.squadRating})`;
}

/** Exact per-XI chance line from `xi-chance.ts` (`copy-figures.md` note). */
export function xiChanceLine(best: PersonalBestRecord): string {
  return `This XI goes 17-0 about 1 in ${best.oneInLabel} seasons · title chance ${best.titlePct}% (${best.tier})`;
}

/** Verified strategy benchmark from `/workspace/analytics/17-0-chance/copy-figures.md`. */
export function strategyBenchmarkLine(best: PersonalBestRecord): string {
  if (best.stage === "17-0") {
    return `A good draft goes 17-0 about 1 in ${COPY_FIGURES.goodDraftPerfectOneIn} (${COPY_FIGURES.goodDraftPerfectPct}%); the highest-rated XI about 1 in ${COPY_FIGURES.highestRatedPerfectOneIn} (${COPY_FIGURES.highestRatedPerfectPct}%); the very best XI we found about 1 in ${COPY_FIGURES.bestFoundPerfectOneIn}.`;
  }
  if (best.stage === "Champions") {
    return `A good draft wins the title ${COPY_FIGURES.goodDraftTitlePct}% of the time (about 1 in ${COPY_FIGURES.goodDraftTitleOneIn}) and goes 17-0 about 1 in ${COPY_FIGURES.goodDraftPerfectOneIn}.`;
  }
  return `A good draft wins the title ${COPY_FIGURES.goodDraftTitlePct}% of the time (about 1 in ${COPY_FIGURES.goodDraftTitleOneIn}) and goes 17-0 about 1 in ${COPY_FIGURES.goodDraftPerfectOneIn} (random picks: about 1 in ${COPY_FIGURES.randomPerfectOneIn}).`;
}
