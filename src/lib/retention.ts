/**
 * Cookieless, anonymous retention measurement (see README "Retention tracking").
 *
 * Browser side keeps ONE localStorage entry: first-seen day, last-seen day and the
 * acquisition-source bucket of the first visit. No ID, no cookie, nothing personal.
 * Events carry only {event, bucket, mode, source}; the Worker turns them into aggregate
 * counters. Off unless VITE_RETENTION_ENABLED=1 at build time AND the Worker has the
 * RETENTION Analytics Engine binding.
 */

export const RETENTION_EVENTS = [
  "visit",
  "draft_start",
  "sim_complete",
  "daily_complete",
  "share_click",
  "return_d1",
  "return_d7",
] as const;
export type RetentionEvent = (typeof RETENTION_EVENTS)[number];

export const BUCKETS = ["d0", "d1", "d2-6", "d7", "d8+"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const MODES = ["none", "classic", "legend", "daily"] as const;
export type RetentionMode = (typeof MODES)[number];

/** Closed list so free text (and anything personal) never reaches storage. */
export const SOURCES = [
  "direct",
  "x",
  "reddit",
  "hn",
  "google",
  "bing",
  "duckduckgo",
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "tiktok",
  "producthunt",
  "newsletter",
  "other",
] as const;
export type Source = (typeof SOURCES)[number];

export type RetentionState = { firstSeen: string; lastSeen: string; source: Source };

export const RETENTION_KEY = "ucl170:retention";

const SOURCE_ALIASES: Record<string, Source> = {
  x: "x", twitter: "x", "t.co": "x", "x.com": "x", "twitter.com": "x",
  reddit: "reddit", "reddit.com": "reddit", "old.reddit.com": "reddit", "www.reddit.com": "reddit",
  hn: "hn", hackernews: "hn", "news.ycombinator.com": "hn",
  google: "google", bing: "bing", duckduckgo: "duckduckgo", ddg: "duckduckgo",
  facebook: "facebook", fb: "facebook", instagram: "instagram", ig: "instagram",
  linkedin: "linkedin", youtube: "youtube", tiktok: "tiktok",
  producthunt: "producthunt", "producthunt.com": "producthunt",
  newsletter: "newsletter", email: "newsletter",
};

/** utm_source wins; otherwise the referrer host is bucketed; same-site/no referrer = direct. */
export function sourceBucket(utmSource: string | null | undefined, referrer: string | null | undefined, ownHost?: string): Source {
  const utm = (utmSource ?? "").trim().toLowerCase();
  if (utm) return SOURCE_ALIASES[utm] ?? "other";
  if (!referrer) return "direct";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "direct";
  }
  if (ownHost && (host === ownHost || host.endsWith("." + ownHost))) return "direct";
  if (SOURCE_ALIASES[host]) return SOURCE_ALIASES[host]!;
  const base = host.replace(/^(www|m|l|lm|old)\./, "");
  if (SOURCE_ALIASES[base]) return SOURCE_ALIASES[base]!;
  for (const name of ["google", "bing", "duckduckgo", "facebook", "instagram", "linkedin", "youtube", "tiktok", "reddit"] as const) {
    if (base.split(".").includes(name)) return name;
  }
  return "other";
}

const dayMs = 86_400_000;
const toDay = (d: Date) => d.toISOString().slice(0, 10);
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / dayMs);
}

export function bucketFor(daysSinceFirst: number): Bucket {
  if (daysSinceFirst <= 0) return "d0";
  if (daysSinceFirst === 1) return "d1";
  if (daysSinceFirst < 7) return "d2-6";
  if (daysSinceFirst === 7) return "d7";
  return "d8+";
}

/**
 * Pure: given the stored state (or null) and today, returns the next state plus the events
 * to send. "visit" fires at most once per UTC day per browser, so daily counts approximate
 * unique visitors; return_d1 / return_d7 fire on the first visit of day 1 / day 7.
 */
export function nextVisit(
  prev: RetentionState | null,
  now: Date,
  source: Source,
): { state: RetentionState; events: RetentionEvent[]; bucket: Bucket } {
  const today = toDay(now);
  if (!prev || !/^\d{4}-\d{2}-\d{2}$/.test(prev.firstSeen)) {
    return { state: { firstSeen: today, lastSeen: today, source }, events: ["visit"], bucket: "d0" };
  }
  const since = Math.max(0, daysBetween(prev.firstSeen, today));
  const bucket = bucketFor(since);
  const state = { ...prev, lastSeen: today };
  if (prev.lastSeen === today) return { state, events: [], bucket };
  const events: RetentionEvent[] = ["visit"];
  if (since === 1) events.push("return_d1");
  if (since === 7) events.push("return_d7");
  return { state, events, bucket };
}

// ---------------- browser side ----------------

const ENABLED = (import.meta.env?.["VITE_RETENTION_ENABLED"] as string | undefined) === "1";

function load(): RetentionState | null {
  try {
    const raw = localStorage.getItem(RETENTION_KEY);
    return raw ? (JSON.parse(raw) as RetentionState) : null;
  } catch {
    return null;
  }
}

function send(event: RetentionEvent, bucket: Bucket, source: Source, mode: RetentionMode = "none") {
  try {
    const body = JSON.stringify({ event, bucket, mode, source });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/e", blob)) {
      void fetch("/e", { method: "POST", body, keepalive: true, credentials: "omit", headers: { "content-type": "application/json" } }).catch(() => {});
    }
  } catch {
    /* never break the game for analytics */
  }
}

/** Call once on app load (client only). No-op unless enabled at build time. */
export function trackVisit() {
  if (!ENABLED || typeof window === "undefined" || typeof localStorage === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const src = sourceBucket(params.get("utm_source"), document.referrer, window.location.hostname);
  const { state, events, bucket } = nextVisit(load(), new Date(), src);
  try {
    localStorage.setItem(RETENTION_KEY, JSON.stringify(state));
  } catch {
    return;
  }
  for (const e of events) send(e, bucket, state.source);
}

/** Gameplay events (draft_start, sim_complete, daily_complete, share_click). */
export function trackEvent(event: RetentionEvent, mode: RetentionMode = "none") {
  if (!ENABLED || typeof window === "undefined") return;
  const s = load();
  if (!s) return;
  send(event, bucketFor(Math.max(0, daysBetween(s.firstSeen, toDay(new Date())))), s.source, mode);
}
