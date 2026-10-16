/**
 * Share text for a finished run. Strings are Marketing's final copy
 * (/workspace/share/final-share-strings.md, 16 Oct 2026), used verbatim; no hashtags.
 */
import STATS from "./sim-stats.json";
import { SITE_URL } from "./site";
import type { Campaign } from "./sim";

/**
 * Rarity for a perfect run, from the real sims only.
 * Source: sim-stats.json `greedy.perfectPct` (scripts/sim-harness.ts, 100k runs, default tuning):
 * an XI drafted by taking the best-rated of the 4 options every round goes 17-0 in 0.39% of runs
 * (re-run 16 Oct: 0.393%), i.e. about 1 in 254. Random drafting is ~1 in 3,400 and the single best
 * possible XI ~1 in 81, so "a sensible draft" is the defensible middle. Rounded to the nearest 50
 * and recomputed whenever sim-stats.json is regenerated, so the copy never drifts from the sims.
 */
export function perfectOneIn(pct: number = STATS.greedy.perfectPct): number {
  return Math.max(50, Math.round(100 / pct / 50) * 50);
}

const SQUARE = { W: "✅", D: "🟨", L: "❌" } as const;

/** One square per match played (max 17). */
export function resultGrid(c: Pick<Campaign, "results">): string {
  return c.results.map((m) => SQUARE[m.outcome]).join("");
}

const EXITS: Record<string, string> = {
  "League Phase": "out in the league phase",
  Playoff: "out in the play-off",
  "Round of 16": "out in the last 16",
  "Quarter-Final": "out in the QF",
  "Semi-Final": "out in the semis",
  Final: "lost the final",
};

export function exitPhrase(c: Pick<Campaign, "champion" | "eliminatedIn">): string {
  if (c.champion) return "champions";
  return EXITS[c.eliminatedIn ?? ""] ?? "out";
}

export type ShareTextInput = {
  campaign: Campaign;
  /** Daily number (#1 = 11 Oct 2026); set only for Daily Challenge runs. */
  dailyNumber?: number | undefined;
  /** v2 challenge code for this exact run; links to /draft?c=<code>. */
  challengeCode?: string | undefined;
  origin?: string;
};

export function runLink({ dailyNumber, challengeCode, origin = SITE_URL }: Omit<ShareTextInput, "campaign">): string {
  if (challengeCode) return `${origin}/draft?c=${challengeCode}`;
  if (dailyNumber !== undefined) return `${origin}/daily`;
  return `${origin}/draft`;
}

/** Returns the message body (without the link) and the link, plus the full text for copying. */
export function shareText(input: ShareTextInput): { body: string; url: string; full: string } {
  const c = input.campaign;
  const wdl = `${c.won}-${c.drawn}-${c.lost}`;
  const grid = resultGrid(c);
  let lines: string[];
  if (input.dailyNumber !== undefined) {
    lines = [`17-0 Daily #${input.dailyNumber}: ${wdl}`, grid, "Same legends for everyone today. Can you beat it?"];
  } else if (c.perfect) {
    lines = ["I went 17-0 in 17-0 Draft 🏆", grid, `In our sims only about 1 in ${perfectOneIn()} runs do that. Think you can?`];
  } else if (c.won === 16) {
    lines = [`${wdl} in 17-0 Draft. One game off perfect 😩`, grid, "Think you can go 17-0?"];
  } else {
    lines = [`${wdl} in 17-0 Draft, ${exitPhrase(c)}`, grid, "Think you can go 17-0?"];
  }
  const url = runLink(input);
  const body = lines.join("\n");
  return { body, url, full: `${body}\n${url}` };
}

/** Length as X counts it: emoji = 2, any URL = 23. */
export function xLength(full: string): number {
  const noUrl = full.replace(/https?:\/\/\S+/g, "");
  const urls = (full.match(/https?:\/\/\S+/g) ?? []).length;
  let n = 0;
  for (const ch of noUrl) n += /\p{Extended_Pictographic}/u.test(ch) ? 2 : ch === "\uFE0F" ? 0 : 1;
  return n + urls * 23;
}
