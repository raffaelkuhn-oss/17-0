/** Shared helpers for /r/<code> run pages (pure; used by the route, the og handler and tests). */
import { decodeChallenge, replayChallenge, CHALLENGE_VERSION_LEGACY, type Challenge } from "../challenge";
import type { Player } from "../players";
import type { Campaign } from "../sim";
import { recordWDL } from "../record";
import { exitPhrase } from "../share-text";
import { xiStamp, type XiStamp } from "../xi-chance";

/** Bump when the preview layout changes: it is part of the image URL, so old edge caches are bypassed. */
export const OG_VERSION = 3; // v3 (18 Oct 2026): XI stamp line (tier + "1 in N") and "Can your XI beat 1 in N?"; v2: record as "11W 0D 1L"
/** sha256 prefix of src/lib/og/run-image.ts at this OG_VERSION. scripts/test-run-pages.ts fails when the
 * layout file changes without updating this, as a reminder to bump OG_VERSION (and then this hash). */
// 18 Oct: hash also covers xiDare() output; the dare moved into the shared helper with byte-identical og PNGs, so no version bump.
export const OG_LAYOUT_SHA = "5e3c185f2ff3a889";
export const RUN_OG_PATH = /^\/r\/([A-Za-z0-9_-]{1,80})\/og-v(\d+)\.png$/;
export const runOgPath = (code: string) => `/r/${code}/og-v${OG_VERSION}.png`;
/** For an older-version image path (e.g. og-v1.png in a link preview scraped before a layout bump), the
 * current-version path to redirect to; null for the current version, future versions or bad paths. Old
 * URLs then show the run (new layout) instead of the generic fallback, and never reuse the old image. */
export function upgradedOgPath(pathname: string): string | null {
  const m = RUN_OG_PATH.exec(pathname);
  if (!m) return null;
  const v = Number(m[2]);
  return v >= 1 && v < OG_VERSION ? runOgPath(m[1]!) : null;
}

export type RunView = { challenge: Challenge; picks: Player[]; campaign: Campaign; legacy: boolean };

/** Rebuilds a run from its v2 (or frozen-pool v1) challenge code. Null for anything invalid. */
export function runFromCode(code: string): RunView | null {
  const challenge = decodeChallenge(code);
  if (!challenge) return null;
  const run = replayChallenge(challenge);
  if (!run) return null;
  return { challenge, ...run, legacy: challenge.version === CHALLENGE_VERSION_LEGACY };
}

/** The run's XI stamp, recomputed from the code (never read from the URL). */
export function runStamp(run: RunView): XiStamp {
  return xiStamp(run.picks);
}

/** og:title per copy-stamp.md §4 (a perfect run keeps the brand label "17-0"). */
export function runOgTitle(c: Campaign, stamp: XiStamp): string {
  return `${c.perfect ? "17-0" : recordWDL(c)} in 17-0 Draft. This XI goes 17-0 about 1 in ${stamp.n}`;
}

export function runTitle(c: Campaign): string {
  if (c.perfect) return "A perfect 17-0 run";
  return `${recordWDL(c)}, ${exitPhrase(c)}`;
}
