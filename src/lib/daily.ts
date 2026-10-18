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

/** Next puzzle drop: the next 00:00 UTC after `now`. */
export function nextDailyAt(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** Hours until the next puzzle drops (00:00 UTC). */
export function hoursUntilNext(now = new Date()): number {
  return Math.max(0, Math.ceil((nextDailyAt(now).getTime() - now.getTime()) / 3_600_000));
}

/**
 * The reset is 00:00 UTC for everyone; this shows when that falls on the visitor's clock,
 * e.g. "02:00" in Zurich (CEST). timeZone/locale are injectable for tests.
 */
export function localResetTime(now = new Date(), opts: { timeZone?: string; locale?: string } = {}): string {
  try {
    return nextDailyAt(now).toLocaleTimeString(opts.locale ?? "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      ...(opts.timeZone ? { timeZone: opts.timeZone } : {}),
    });
  } catch {
    return "00:00 UTC";
  }
}

/** "9h 58m", "58m 07s", "0s". */
export function countdownLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
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

/** How far a Daily run got, for the Wordle-style distribution. */
export const OUTCOMES = ["League Phase", "Playoff", "Round of 16", "Quarter-Final", "Semi-Final", "Final", "Champions", "17-0"] as const;
export type Outcome = (typeof OUTCOMES)[number];
export const OUTCOME_LABEL: Record<Outcome, string> = {
  "League Phase": "League phase",
  Playoff: "Play-off",
  "Round of 16": "Last 16",
  "Quarter-Final": "Quarter-final",
  "Semi-Final": "Semi-final",
  Final: "Lost final",
  Champions: "Champions",
  "17-0": "17-0",
};
export function outcomeOf(r: { perfect: boolean; champion: boolean; eliminatedIn: string | null }): Outcome {
  if (r.perfect) return "17-0";
  if (r.champion) return "Champions";
  return (OUTCOMES as readonly string[]).includes(r.eliminatedIn ?? "") ? (r.eliminatedIn as Outcome) : "League Phase";
}

export type DailyHistoryEntry = { key: string; won: number; drawn: number; lost: number; o: Outcome };

/**
 * Stats kept in localStorage only (key "ucl170:daily:stats"); nothing is sent to the server.
 * v2 adds the outcome distribution and a short history. v1 entries (no "v") are migrated on load:
 * counters are kept and the distribution/history are rebuilt from the per-day records still stored.
 */
export type DailyStats = {
  v: 2;
  played: number;
  titles: number;
  perfects: number;
  /** Streak as of lastKey; use currentStreak() for display (it drops to 0 after a missed day). */
  streak: number;
  bestStreak: number;
  lastKey: string | null;
  dist: Record<Outcome, number>;
  history: DailyHistoryEntry[];
};

export const HISTORY_MAX = 30;
const RESULT_PREFIX = "ucl170:daily:";
const STATS_KEY = "ucl170:daily:stats";
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const emptyDist = (): Record<Outcome, number> => Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<Outcome, number>;
export function emptyStats(): DailyStats {
  return { v: 2, played: 0, titles: 0, perfects: 0, streak: 0, bestStreak: 0, lastKey: null, dist: emptyDist(), history: [] };
}

/** The storage subset used here; injectable for tests. */
export type StorageLike = {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  key(i: number): string | null;
  readonly length: number;
};

/**
 * localStorage, or null when there is none (SSR) or it is blocked (some private modes throw on
 * access or on write). Every caller treats null as "no stats yet" and never throws.
 */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    if (!s) return null;
    const probe = "ucl170:probe";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function read(storage: StorageLike | null, k: string): unknown {
  if (!storage) return null;
  try {
    const raw = storage.getItem(k);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function write(storage: StorageLike | null, k: string, v: unknown): boolean {
  if (!storage) return false;
  try {
    storage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false; // quota exceeded / blocked: keep going without persisting
  }
}

const count = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.min(Math.floor(x), 1_000_000) : 0);
/** A parsed JSON object whose fields are all still unchecked. */
type Loose = {
  [k: string]: unknown;
  v?: unknown; key?: unknown; won?: unknown; drawn?: unknown; lost?: unknown; champion?: unknown; perfect?: unknown;
  eliminatedIn?: unknown; names?: unknown; o?: unknown; played?: unknown; titles?: unknown; perfects?: unknown;
  streak?: unknown; bestStreak?: unknown; lastKey?: unknown; dist?: unknown; history?: unknown;
};
const isObj = (x: unknown): x is Loose => typeof x === "object" && x !== null && !Array.isArray(x);

function toRecord(x: unknown, key?: string): DailyRecord | null {
  if (!isObj(x)) return null;
  const k = typeof x.key === "string" && KEY_RE.test(x.key) ? x.key : key;
  if (!k || !KEY_RE.test(k)) return null;
  if (![x.won, x.drawn, x.lost].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 17)) return null;
  return {
    ...(x as DailyRecord),
    key: k,
    champion: x.champion === true,
    perfect: x.perfect === true,
    eliminatedIn: typeof x.eliminatedIn === "string" ? x.eliminatedIn : null,
    names: Array.isArray(x.names) ? x.names.filter((n): n is string => typeof n === "string") : [],
  };
}

const entryOf = (r: DailyRecord): DailyHistoryEntry => ({ key: r.key, won: r.won, drawn: r.drawn, lost: r.lost, o: outcomeOf(r) });

/** Per-day records still in storage, oldest first (used to migrate v1 stats). */
function storedRecords(storage: StorageLike | null): DailyRecord[] {
  if (!storage) return [];
  const out: DailyRecord[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k || !k.startsWith(RESULT_PREFIX) || !KEY_RE.test(k.slice(RESULT_PREFIX.length))) continue;
      const r = toRecord(read(storage, k), k.slice(RESULT_PREFIX.length));
      if (r) out.push(r);
    }
  } catch {
    return out;
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/** Validates any stored value (v2, v1, corrupt, wrong types) into a well-formed DailyStats. */
export function normalizeStats(raw: unknown, storage: StorageLike | null = null): DailyStats {
  if (!isObj(raw)) return emptyStats();
  const s = emptyStats();
  s.played = count(raw.played);
  s.titles = count(raw.titles);
  s.perfects = count(raw.perfects);
  s.streak = count(raw.streak);
  s.lastKey = typeof raw.lastKey === "string" && KEY_RE.test(raw.lastKey) ? raw.lastKey : null;
  if (!s.lastKey) s.streak = 0;
  s.bestStreak = Math.max(count(raw.bestStreak), s.streak);
  if (raw.v === 2 && isObj(raw.dist)) {
    const dist = raw.dist as Record<string, unknown>;
    for (const o of OUTCOMES) s.dist[o] = count(dist[o]);
    s.history = (Array.isArray(raw.history) ? raw.history : [])
      .map((h) => (isObj(h) ? toRecord({ ...h, perfect: h.o === "17-0", champion: h.o === "Champions", eliminatedIn: h.o }) : null))
      .filter((r): r is DailyRecord => r !== null)
      .map(entryOf)
      .slice(-HISTORY_MAX);
  } else {
    // v1 migration: rebuild the distribution and history from the per-day records we still have.
    const recs = storedRecords(storage);
    for (const r of recs) s.dist[outcomeOf(r)]++;
    s.history = recs.map(entryOf).slice(-HISTORY_MAX);
  }
  s.played = Math.max(s.played, s.history.length);
  return s;
}

export function loadDailyResult(key = dailyKey(), storage: StorageLike | null = browserStorage()): DailyRecord | null {
  return toRecord(read(storage, RESULT_PREFIX + key), key);
}

export function loadDailyStats(storage: StorageLike | null = browserStorage()): DailyStats {
  const raw = read(storage, STATS_KEY);
  const stats = normalizeStats(raw, storage);
  if (isObj(raw) && raw.v !== 2) write(storage, STATS_KEY, stats); // persist the v1 -> v2 migration once
  return stats;
}

export function yesterdayOf(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = Date.UTC(y!, (m ?? 1) - 1, (d ?? 1) - 1);
  return new Date(t).toISOString().slice(0, 10);
}

/** Streak to display today: the stored streak if the last Daily was today or yesterday, else 0. */
export function currentStreak(stats: DailyStats | null, today = dailyKey()): number {
  if (!stats?.lastKey) return 0;
  return stats.lastKey === today || stats.lastKey === yesterdayOf(today) ? stats.streak : 0;
}

/** Persists today's run and rolls the streak forward. Ignores repeat saves and older days. */
export function saveDailyResult(
  campaign: Campaign,
  names: string[],
  key = dailyKey(),
  rating = 0,
  storage: StorageLike | null = browserStorage(),
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

  const stats = loadDailyStats(storage);
  // Same day again (or a clock that went backwards): keep the stats as they are.
  if (stats.lastKey && key <= stats.lastKey) return { record, stats };

  const next: DailyStats = {
    ...stats,
    played: stats.played + 1,
    titles: stats.titles + (campaign.champion ? 1 : 0),
    perfects: stats.perfects + (campaign.perfect ? 1 : 0),
    streak: stats.lastKey === yesterdayOf(key) ? stats.streak + 1 : 1,
    lastKey: key,
    dist: { ...stats.dist, [outcomeOf(record)]: stats.dist[outcomeOf(record)] + 1 },
    history: [...stats.history, entryOf(record)].slice(-HISTORY_MAX),
  };
  next.bestStreak = Math.max(next.bestStreak, next.streak);

  write(storage, RESULT_PREFIX + key, record);
  write(storage, STATS_KEY, next);
  return { record, stats: next };
}
