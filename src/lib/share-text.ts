/**
 * Share text for a finished run. Strings are Marketing's final copy
 * (/workspace/share/final-share-strings.md, 16 Oct 2026), used verbatim; no hashtags.
 */
import STATS from "./sim-stats.json";
import { SITE_URL } from "./site";
import { recordWDL } from "./record";
import type { Campaign } from "./sim";
import type { XiStamp } from "./xi-chance";

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
  /** Current Daily streak (localStorage only); shown in the Daily text from 2 days up. */
  dailyStreak?: number | undefined;
  /** v2 challenge code for this exact run; links to the run page /r/<code>. */
  challengeCode?: string | undefined;
  origin?: string;
  /** The XI's "1 in N" stamp (xi-chance.ts). Computed on the device; only the text the player shares carries it. */
  stamp?: XiStamp | undefined;
};

/** X's limit; the "My XI: …" line is dropped first if a text would run over (copy-stamp.md §3). */
export const X_LIMIT = 280;

export function runLink({ dailyNumber, challengeCode, origin = SITE_URL }: Omit<ShareTextInput, "campaign" | "dailyStreak">): string {
  if (challengeCode) return `${origin}/r/${challengeCode}`;
  if (dailyNumber !== undefined) return `${origin}/daily`;
  return `${origin}/draft`;
}

/** Returns the message body (without the link) and the link, plus the full text for copying. */
export function shareText(input: ShareTextInput): { body: string; url: string; full: string } {
  const c = input.campaign;
  const wdl = recordWDL(c); // "11W 0D 1L" (copy-final.md #3)
  const grid = resultGrid(c);
  const st = input.stamp;
  // Stamp lines: /workspace/aha/copy-stamp.md §3 (final copy, verbatim).
  const myXi = st ? `My XI: ${st.tier} · goes 17-0 about 1 in ${st.n}` : null;
  const dare = st ? `Can your XI beat 1 in ${st.n}?` : "Think you can go 17-0?";
  let lines: (string | null)[];
  if (input.dailyNumber !== undefined) {
    const streak = input.dailyStreak ?? 0;
    const head = `17-0 Daily #${input.dailyNumber}: ${wdl}`;
    lines = [
      streak >= 2 ? `${head} · 🔥 ${streak}-day streak` : head,
      grid,
      myXi,
      st ? "Same legends for everyone today. Can you beat it?" : "Same first picks for everyone today. Can you beat it?",
    ];
  } else if (c.perfect) {
    lines = [
      "I went 17-0 in 17-0 Draft 🏆",
      grid,
      st ? `My XI does that about 1 in ${st.n} seasons. Think you can?` : `In our sims only about 1 in ${perfectOneIn()} runs do that. Think you can?`,
    ];
  } else if (c.won === 16) {
    lines = [`${wdl} in 17-0 Draft. One game off perfect 😩`, grid, myXi, dare];
  } else {
    lines = [`${wdl} in 17-0 Draft, ${exitPhrase(c)}`, grid, myXi, dare];
  }
  const url = runLink(input);
  const build = (ls: (string | null)[]) => {
    const body = ls.filter((l): l is string => !!l).join("\n");
    return { body, url, full: `${body}\n${url}` };
  };
  const out = build(lines);
  return xLength(out.full) > X_LIMIT && myXi ? build(lines.filter((l) => l !== myXi)) : out;
}

/**
 * Length as X counts it (twitter-text v3 weighting): any URL = 23; code points in U+0000–10FF,
 * U+2000–200D, U+2010–201F and U+2032–2037 weigh 1; everything else (emoji, CJK, "…") weighs 2.
 * An emoji with a variation selector (U+FE0F) or ZWJ sequence counts once (2).
 */
export function xLength(full: string): number {
  const urlRe = /https?:\/\/\S+/g;
  const urls = (full.match(urlRe) ?? []).length;
  const rest = full.replace(urlRe, "");
  let n = 0;
  let joinNext = false;
  for (const ch of rest) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0xfe0f) continue;
    if (cp === 0x200d) {
      joinNext = true;
      continue;
    }
    if (joinNext) {
      joinNext = false;
      continue;
    }
    const light = cp <= 0x10ff || (cp >= 0x2000 && cp <= 0x200d) || (cp >= 0x2010 && cp <= 0x201f) || (cp >= 0x2032 && cp <= 0x2037);
    n += light ? 1 : 2;
  }
  return n + urls * 23;
}
