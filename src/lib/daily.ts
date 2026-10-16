import type { Campaign } from "./sim";

/** UTC date key, e.g. "2026-08-11". Everyone worldwide shares the same puzzle. */
export function dailyKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministic seed derived from the date key + the pool version.
 * DAILY_POOL_VERSION must bump when the legends pool or SIM_TUNING changes in a way that
 * would make today's candidates or results differ. Deploy on a UTC midnight boundary so an
 * in-progress daily never straddles two versions.
 */
export const DAILY_POOL_VERSION = "v2";
export function dailySeed(key = dailyKey()): number {
  const material = `${key}|${DAILY_POOL_VERSION}`;
  let h = 2166136261;
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyLabel(key = dailyKey()): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Daily number for share text: #1 = 2026-10-11 (launch day), +1 per UTC day. */
export const DAILY_EPOCH = "2026-10-11";
export function dailyNumber(key = dailyKey()): number {
  return Math.round((Date.parse(key + "T00:00:00Z") - Date.parse(DAILY_EPOCH + "T00:00:00Z")) / 86_400_000) + 1;
}

/** Hours until the next puzzle drops (00:00 UTC). */
export function hoursUntilNext(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, Math.ceil((next - now.getTime()) / 3_600_000));
}

export type DailyRecord = {
  key: string;
  won: number;
  drawn: number;
  lost: number;
  champion: boolean;
  perfect: boolean;
  eliminatedIn: string | null;
  names: string[];
  /** Full campaign + squad rating, kept so the result can be re-shared later. */
  campaign?: Campaign;
  rating?: number;
};

export type DailyStats = {
  played: number;
  titles: number;
  perfects: number;
  streak: number;
  bestStreak: number;
  lastKey: string | null;
};

const RESULT_PREFIX = "ucl170:daily:";
const STATS_KEY = "ucl170:daily:stats";

const EMPTY_STATS: DailyStats = {
  played: 0,
  titles: 0,
  perfects: 0,
  streak: 0,
  bestStreak: 0,
  lastKey: null,
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadDailyResult(key = dailyKey()): DailyRecord | null {
  if (typeof localStorage === "undefined") return null;
  return safeParse<DailyRecord | null>(localStorage.getItem(RESULT_PREFIX + key), null);
}

export function loadDailyStats(): DailyStats {
  if (typeof localStorage === "undefined") return EMPTY_STATS;
  return safeParse<DailyStats>(localStorage.getItem(STATS_KEY), EMPTY_STATS);
}

function yesterdayOf(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = Date.UTC(y!, (m ?? 1) - 1, (d ?? 1) - 1);
  return new Date(t).toISOString().slice(0, 10);
}

/** Persists today's run and rolls the streak forward. Ignores repeat saves. */
export function saveDailyResult(
  campaign: Campaign,
  names: string[],
  key = dailyKey(),
  rating = 0,
): { record: DailyRecord; stats: DailyStats } {
  const record: DailyRecord = {
    key,
    won: campaign.won,
    drawn: campaign.drawn,
    lost: campaign.lost,
    champion: campaign.champion,
    perfect: campaign.perfect,
    eliminatedIn: campaign.eliminatedIn,
    names,
    campaign,
    rating,
  };

  const stats = loadDailyStats();
  if (stats.lastKey === key) return { record, stats };

  const next: DailyStats = {
    played: stats.played + 1,
    titles: stats.titles + (campaign.champion ? 1 : 0),
    perfects: stats.perfects + (campaign.perfect ? 1 : 0),
    streak: stats.lastKey === yesterdayOf(key) ? stats.streak + 1 : 1,
    bestStreak: stats.bestStreak,
    lastKey: key,
  };
  next.bestStreak = Math.max(next.bestStreak, next.streak);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(RESULT_PREFIX + key, JSON.stringify(record));
    localStorage.setItem(STATS_KEY, JSON.stringify(next));
  }
  return { record, stats: next };
}
