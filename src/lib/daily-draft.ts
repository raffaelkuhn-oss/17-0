/**
 * Daily draft verification against a pool (pure, current pool by default).
 * The legacy (frozen v1 pool) grace path lives in daily-draft.server.ts so the v1 pool is never
 * bundled into the client; it is deleted with the 21 Oct v1 cookie PR.
 */
import { FORMATION, PLAYERS, type Player } from "./players";
import { candidatesFor } from "./sim";

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
