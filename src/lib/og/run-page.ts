/** Shared helpers for /r/<code> run pages (pure; used by the route, the og handler and tests). */
import { decodeChallenge, replayChallenge, CHALLENGE_VERSION_LEGACY, type Challenge } from "../challenge";
import type { Player } from "../players";
import type { Campaign } from "../sim";
import { recordLabel } from "../record";
import { exitPhrase } from "../share-text";

/** Bump when the preview layout changes: it is part of the image URL, so old edge caches are bypassed. */
export const OG_VERSION = 1;
/** sha256 prefix of src/lib/og/run-image.ts at this OG_VERSION. scripts/test-run-pages.ts fails when the
 * layout file changes without updating this, as a reminder to bump OG_VERSION (and then this hash). */
export const OG_LAYOUT_SHA = "46357e22e2db268f";
export const RUN_OG_PATH = /^\/r\/([A-Za-z0-9_-]{1,80})\/og-v(\d+)\.png$/;
export const runOgPath = (code: string) => `/r/${code}/og-v${OG_VERSION}.png`;

export type RunView = { challenge: Challenge; picks: Player[]; campaign: Campaign; legacy: boolean };

/** Rebuilds a run from its v2 (or frozen-pool v1) challenge code. Null for anything invalid. */
export function runFromCode(code: string): RunView | null {
  const challenge = decodeChallenge(code);
  if (!challenge) return null;
  const run = replayChallenge(challenge);
  if (!run) return null;
  return { challenge, ...run, legacy: challenge.version === CHALLENGE_VERSION_LEGACY };
}

export function runTitle(c: Campaign): string {
  if (c.perfect) return "A perfect 17-0 run";
  return `${recordLabel(c)}, ${exitPhrase(c)}`;
}
