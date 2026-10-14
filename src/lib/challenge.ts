// Challenge-a-friend links (client-only, nothing stored server-side).
// Payload = base64url("v1|<mode c|l>|<seed base36>|<11 pick indexes 0-3>").
// Picks are indexes into the seeded candidate list for each slot, so the link is short and the
// challenger's XI (and result) is rebuilt from seed + indexes, never trusted from the URL.
// Always the legends-only pool (never the live-players pool), never the Daily.
import { FORMATION, PLAYERS, type Player } from "./players";
import { candidatesFor, simulate, SIM_TUNING, type Campaign } from "./sim";
import { PLAYERS_V1, SIM_TUNING_V1 } from "./legacy/players-v1";

export const CHALLENGE_VERSION = "v2";
/** Pre-rebalance links keep resolving against the frozen v1 pool + tuning. */
export const CHALLENGE_VERSION_LEGACY = "v1";
export const CANDIDATES_PER_PICK = 4;
export type ChallengeMode = "classic" | "legend";
export type Challenge = { mode: ChallengeMode; seed: number; picks: number[]; version?: string };

export function rngFactory(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Candidate cards for a slot; shared by the draft UI and link replay so both see the same cards. */
export function slotCandidates(
  seed: number,
  step: number,
  taken: Player[],
  pool: readonly Player[] = PLAYERS,
) {
  const slot = FORMATION[step];
  if (!slot) return [];
  return candidatesFor(
    slot.role,
    new Set(taken.map((p) => p.id)),
    CANDIDATES_PER_PICK,
    rngFactory(seed + step * 7919),
    pool,
  );
}

const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

export function encodeChallenge(c: Challenge): string {
  return b64url(
    [
      c.version ?? CHALLENGE_VERSION,
      c.mode === "legend" ? "l" : "c",
      c.seed.toString(36),
      c.picks.join(""),
    ].join("|"),
  );
}

/** Returns null for anything malformed or tampered; callers fall back to a normal draft. */
export function decodeChallenge(raw: unknown): Challenge | null {
  if (
    typeof raw !== "string" ||
    raw.length === 0 ||
    raw.length > 80 ||
    !/^[A-Za-z0-9_-]+$/.test(raw)
  )
    return null;
  let text: string;
  try {
    text = unb64url(raw);
  } catch {
    return null;
  }
  const parts = text.split("|");
  if (parts.length !== 4) return null;
  const [v, m, s, p] = parts as [string, string, string, string];
  if ((v !== CHALLENGE_VERSION && v !== CHALLENGE_VERSION_LEGACY) || (m !== "c" && m !== "l"))
    return null;
  if (!/^[0-9a-z]{1,7}$/.test(s)) return null;
  const seed = parseInt(s, 36);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed >= 1e9) return null;
  if (!new RegExp(`^[0-${CANDIDATES_PER_PICK - 1}]{${FORMATION.length}}$`).test(p)) return null;
  const c: Challenge = {
    mode: m === "l" ? "legend" : "classic",
    seed,
    picks: [...p].map(Number),
    version: v,
  };
  return replayChallenge(c) ? c : null;
}

function withTuning<T>(tune: Record<string, number>, fn: () => T): T {
  const prev = { ...SIM_TUNING };
  Object.assign(SIM_TUNING, tune);
  try {
    return fn();
  } finally {
    Object.assign(SIM_TUNING, prev);
  }
}

/** Rebuilds the challenger's XI and result from seed + indexes. Null if an index is not a real card. */
export function replayChallenge(c: Challenge): { picks: Player[]; campaign: Campaign } | null {
  const version = c.version ?? CHALLENGE_VERSION;
  const pool = version === CHALLENGE_VERSION_LEGACY ? PLAYERS_V1 : PLAYERS;
  const run = () => {
    const picks: Player[] = [];
    for (let step = 0; step < FORMATION.length; step++) {
      const p = slotCandidates(c.seed, step, picks, pool)[c.picks[step]!];
      if (!p) return null;
      picks.push(p);
    }
    if (new Set(picks.map((p) => p.id)).size !== FORMATION.length) return null;
    return { picks, campaign: simulate(picks, c.seed) };
  };
  return version === CHALLENGE_VERSION_LEGACY
    ? withTuning({ ...SIM_TUNING_V1, FINAL_BONUS: 0 }, run)
    : run();
}
