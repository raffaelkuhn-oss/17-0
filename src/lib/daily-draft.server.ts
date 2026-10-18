/**
 * Server-only Daily draft resolution (leaderboard submit path and its tests).
 * Prefers the current pool + seed. After a pool/tuning change, drafts started on the old client
 * still resolve against the frozen v1 pool until DAILY_GRACE_UNTIL_MS. Kept out of the client bundle
 * (the v1 pool contains current CL players); delete the legacy path with the 21 Oct v1 cookie PR.
 */
import { PLAYERS } from "./players";
import { PLAYERS_V1, SIM_TUNING_V1 } from "./legacy/players-v1";
import { simulate, SIM_TUNING, type Campaign } from "./sim";
import { DAILY_POOL_VERSION, dailySeed } from "./daily";
import { verifyDraft } from "./daily-draft";
import type { Player } from "./players";

/** End of grace: 16 Oct 2026 00:00 UTC = next midnight after the 15 Oct 00:00 UTC deploy. */
export const DAILY_GRACE_UNTIL_MS = Date.UTC(2026, 9, 16, 0, 0, 0);

/** Pre-v2 seed material was the bare date key (no version suffix). */
export const DAILY_POOL_VERSION_LEGACY = "v1";

export function isDailyGraceActive(now = Date.now()): boolean {
  return now < DAILY_GRACE_UNTIL_MS;
}

/** Seed used by clients before DAILY_POOL_VERSION was introduced. */
export function dailySeedLegacy(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type ResolvedDailyDraft = {
  picks: Player[];
  seed: number;
  version: typeof DAILY_POOL_VERSION | typeof DAILY_POOL_VERSION_LEGACY;
  campaign: Campaign;
};

function withTuning<T>(tune: Record<string, number>, fn: () => T): T {
  const prev = { ...SIM_TUNING };
  Object.assign(SIM_TUNING, tune);
  try {
    return fn();
  } finally {
    Object.assign(SIM_TUNING, prev);
  }
}

/**
 * Prefer the current pool + seed. During the grace window, also accept a draft
 * that only validates against the frozen v1 pool and the pre-version seed.
 */
export function resolveDailyDraft(
  names: string[],
  dayKey: string,
  now = Date.now(),
): ResolvedDailyDraft | null {
  const seed = dailySeed(dayKey);
  const current = verifyDraft(names, seed, PLAYERS);
  if (current) {
    return { picks: current, seed, version: DAILY_POOL_VERSION, campaign: simulate(current, seed) };
  }
  if (!isDailyGraceActive(now)) return null;
  const legacySeed = dailySeedLegacy(dayKey);
  const legacy = verifyDraft(names, legacySeed, PLAYERS_V1);
  if (!legacy) return null;
  const campaign = withTuning({ ...SIM_TUNING_V1, FINAL_BONUS: 0 }, () =>
    simulate(legacy, legacySeed),
  );
  return { picks: legacy, seed: legacySeed, version: DAILY_POOL_VERSION_LEGACY, campaign };
}
