/**
 * Daily draft verification and resolution (pure, current pool + current seed).
 * Used by the leaderboard submit path to recompute the authoritative result.
 */
import { FORMATION, PLAYERS, type Player } from "./players";
import { candidatesFor, simulate, type Campaign } from "./sim";
import { DAILY_POOL_VERSION, dailySeed } from "./daily";

function rngFactory(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function verifyDraft(
  names: string[],
  seed: number,
  pool: readonly Player[] = PLAYERS,
): Player[] | null {
  const picks: Player[] = [];
  for (let step = 0; step < FORMATION.length; step++) {
    const slot = FORMATION[step]!;
    const taken = new Set(picks.map((p) => p.id));
    const offered = candidatesFor(slot.role, taken, 4, rngFactory(seed + step * 7919), pool);
    const chosen = offered.find((p) => p.name === names[step]);
    if (!chosen) return null;
    picks.push(chosen);
  }
  return picks;
}

export type ResolvedDailyDraft = {
  picks: Player[];
  seed: number;
  version: typeof DAILY_POOL_VERSION;
  campaign: Campaign;
};

/** Resolve a submitted Daily draft against the current pool and today's seed; null if it isn't valid. */
export function resolveDailyDraft(names: string[], dayKey: string): ResolvedDailyDraft | null {
  const seed = dailySeed(dayKey);
  const picks = verifyDraft(names, seed, PLAYERS);
  if (!picks) return null;
  return { picks, seed, version: DAILY_POOL_VERSION, campaign: simulate(picks, seed) };
}
