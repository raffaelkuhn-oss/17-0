/**
 * Cookieless, anonymous retention measurement (see README "Retention tracking").
 *
 * Browser side keeps ONE localStorage entry: first-seen day, last-seen day, the
 * acquisition-source bucket and creator code (c01-c30, if any) of the first visit, and a
 * "day-7 return already counted" flag. No ID, no cookie, nothing personal.
 * Events carry only {event, bucket, mode, source, ref, via} (+ outcome on sim_complete); the Worker turns them into aggregate
 * counters. Off unless VITE_RETENTION_ENABLED=1 at build time AND the Worker has the
 * RETENTION Analytics Engine binding.
 */

import type { Campaign } from "./sim";

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
  /** Landed on a shared run (/r/<code>) or a Challenge link (/draft?c=<code>); see landingSource(). */
  "share",
  "other",
] as const;
export type Source = (typeof SOURCES)[number];

/** Which share path was used (share_click only; closed list). */
export const SHARE_VIAS = ["native", "file", "copy", "x", "whatsapp", "download", "challenge"] as const;
export type ShareVia = (typeof SHARE_VIAS)[number];

/**
 * How a finished run ended (sim_complete only; closed list, blob8). Mapped from sim.ts simulate():
 * - perfect:  17-0 (8 league wins, both legs of all 4 two-legged ties, and the final) = Campaign.perfect
 * - champion: won the final, not 17-0 (Campaign.champion && !perfect)
 * - final:    lost the final (eliminatedIn "Final")
 * - ko:       reached the knockouts (11+ league points) and went out in the Playoff, Round of 16,
 *             Quarter-Final or Semi-Final. The Playoff counts as ko: it is the first two-legged
 *             knockout tie in sim.ts (KO_ROUNDS[0]), played only after clearing the league cut-off.
 * - league:   out in the league phase (eliminatedIn "League Phase", under PLAYOFF_CUTOFF points)
 * Only the bucket is sent: no score, record, picks or anything about the player. Never sent for
 * Daily runs (mode "daily"): the client leaves it out and the Worker forces blob8 to "".
 */
export const OUTCOMES = ["perfect", "champion", "final", "ko", "league"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export function outcomeOf(c: Pick<Campaign, "perfect" | "champion" | "eliminatedIn">): Outcome {
  if (c.perfect) return "perfect";
  if (c.champion) return "champion";
  if (c.eliminatedIn === "Final") return "final";
  if (c.eliminatedIn === "League Phase") return "league";
  return "ko";
}

/** Exact match only (no trimming or case folding): anything else is not an outcome. */
export function parseOutcome(raw: unknown): Outcome | null {
  return typeof raw === "string" && (OUTCOMES as readonly string[]).includes(raw)
    ? (raw as Outcome)
    : null;
}

/** Creator codes for the creator test, c01-c30 (closed list; anything else is ignored). c02/c07/c08 stay valid while unassigned. */
// prettier-ignore
export const REFS = [
  "c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c10",
  "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20",
  "c21", "c22", "c23", "c24", "c25", "c26", "c27", "c28", "c29", "c30",
] as const;
export type Ref = (typeof REFS)[number];
export type RefOrNone = Ref | "none";

/** Returns the ref code if it is exactly one of REFS (case-insensitive, trimmed), else null. */
export function parseRef(raw: string | null | undefined): Ref | null {
  const v = (raw ?? "").trim().toLowerCase();
  return (REFS as readonly string[]).includes(v) ? (v as Ref) : null;
}

/**
 * ref: creator code from the FIRST visit only (never overwritten).
 * d7: true once return_d7 has fired (or a day-7+ visit already happened), so it fires once per browser.
 */
export type RetentionState = { firstSeen: string; lastSeen: string; source: Source; ref?: Ref; d7?: true };

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

/**
 * True when a landing path is one of our share links: a shared run /r/<code> (every Classic/Legend
 * share) or a Challenge link /draft?c=<code>. Share URLs carry no tag (long ?utm links look like scams
 * in DMs), so the path itself is the signal. Pure; `search` is location.search ("?c=..." or "").
 */
export function isShareLanding(pathname: string | null | undefined, search: string | null | undefined): boolean {
  const p = (pathname ?? "").replace(/\/+$/, "");
  if (/^\/r\/[^/]+$/.test(p)) return true;
  if (p === "/draft") {
    try {
      return !!new URLSearchParams(search ?? "").get("c");
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Pure: the source bucket for a landing. Precedence (first match wins):
 *  1. An explicit tag on the URL: utm_source, or a valid creator ref (?ref=c01..c30). Then the
 *     source is exactly what it was before share attribution (utm bucket, else referrer bucket),
 *     so tagged creator / campaign links are never relabelled as "share".
 *  2. The landing path is a share link (isShareLanding): "share", whatever the referrer
 *     (WhatsApp/iMessage send none; X sends t.co; either way it came from a share).
 *  3. Same-site referrer whose path is a share link: "share". Covers a first-time visitor who opens
 *     /r/<code> and taps "Build your own XI" before the app has hydrated, so the visit is first
 *     counted on /draft (full page load, referrer https://ucl17-0.com/r/<code>). Nothing is stored for this.
 *  4. Otherwise sourceBucket(): referrer host bucket, same-site / no referrer = "direct".
 * Like every source, it only sticks on the browser's first visit (nextVisit keeps the first source).
 */
export function landingSource(l: {
  utmSource?: string | null | undefined;
  ref?: string | null | undefined;
  pathname?: string | null | undefined;
  search?: string | null | undefined;
  referrer?: string | null | undefined;
  ownHost?: string | undefined;
}): Source {
  const utm = (l.utmSource ?? "").trim();
  if (utm || parseRef(l.ref)) return sourceBucket(utm, l.referrer, l.ownHost);
  if (isShareLanding(l.pathname, l.search)) return "share";
  if (l.referrer && l.ownHost) {
    try {
      const u = new URL(l.referrer);
      const host = u.hostname.toLowerCase();
      if ((host === l.ownHost || host.endsWith("." + l.ownHost)) && isShareLanding(u.pathname, u.search)) return "share";
    } catch {
      /* not a URL: fall through */
    }
  }
  return sourceBucket(null, l.referrer, l.ownHost);
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
 * unique visitors; return_d1 fires on the first visit of day 1; return_d7 fires once per
 * browser on the first visit on day 7 or later. ref is only taken on the first visit.
 */
export function nextVisit(
  prev: RetentionState | null,
  now: Date,
  source: Source,
  ref: Ref | null = null,
): { state: RetentionState; events: RetentionEvent[]; bucket: Bucket } {
  const today = toDay(now);
  if (!prev || !/^\d{4}-\d{2}-\d{2}$/.test(prev.firstSeen)) {
    const state: RetentionState = { firstSeen: today, lastSeen: today, source };
    if (ref) state.ref = ref;
    return { state, events: ["visit"], bucket: "d0" };
  }
  const since = Math.max(0, daysBetween(prev.firstSeen, today));
  const bucket = bucketFor(since);
  const state: RetentionState = { ...prev, lastSeen: today };
  if (state.ref && !parseRef(state.ref)) delete state.ref;
  // Migration: a browser that already had a visit on day 7+ (old "exactly day 7" logic) is done.
  if (!state.d7 && /^\d{4}-\d{2}-\d{2}$/.test(prev.lastSeen) && daysBetween(prev.firstSeen, prev.lastSeen) >= 7) {
    state.d7 = true;
  }
  if (prev.lastSeen === today) return { state, events: [], bucket };
  const events: RetentionEvent[] = ["visit"];
  if (since === 1) events.push("return_d1");
  if (since >= 7 && !state.d7) {
    events.push("return_d7");
    state.d7 = true;
  }
  return { state, events, bucket };
}

/** Events that carry the creator ref (visit is included because it is the denominator). */
export const REF_EVENTS: readonly RetentionEvent[] = ["visit", "draft_start", "sim_complete", "share_click", "return_d7"];

/** Pure: the JSON body sent to POST /e. */
export function eventBody(
  event: RetentionEvent,
  bucket: Bucket,
  source: Source,
  mode: RetentionMode,
  ref: Ref | null | undefined,
  via?: ShareVia,
  outcome?: Outcome | null,
) {
  const r: RefOrNone = REF_EVENTS.includes(event) && ref && parseRef(ref) ? ref : "none";
  const v: ShareVia | "none" = event === "share_click" && via && (SHARE_VIAS as readonly string[]).includes(via) ? via : "none";
  // Daily runs never carry an outcome: the footer promises Daily results are never sent (Raffael, 22 Oct).
  const o = event === "sim_complete" && mode !== "daily" ? parseOutcome(outcome) : null;
  return o
    ? { event, bucket, mode, source, ref: r, via: v, outcome: o }
    : { event, bucket, mode, source, ref: r, via: v };
}

// ---------------- browser side ----------------

const ENABLED = (import.meta.env?.["VITE_RETENTION_ENABLED"] as string | undefined) === "1";

/** `typeof localStorage` itself throws when storage is blocked (some private modes), so probe safely. */
function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined" && window.localStorage !== null;
  } catch {
    return false;
  }
}

function load(): RetentionState | null {
  try {
    const raw = localStorage.getItem(RETENTION_KEY);
    return raw ? (JSON.parse(raw) as RetentionState) : null;
  } catch {
    return null;
  }
}

function send(event: RetentionEvent, bucket: Bucket, source: Source, mode: RetentionMode = "none", ref?: Ref, via?: ShareVia, outcome?: Outcome) {
  try {
    const body = JSON.stringify(eventBody(event, bucket, source, mode, ref, via, outcome));
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/e", blob)) {
      void fetch("/e", { method: "POST", body, keepalive: true, credentials: "omit", headers: { "content-type": "application/json" } }).catch(() => {});
    }
  } catch {
    /* never break the game for analytics */
  }
}

/**
 * The URL the page was loaded with, read once when this module is evaluated (before hydration), so a
 * client-side navigation (e.g. /r/<code> -> /draft) before trackVisit's effect runs can't lose the
 * share landing. In memory only; nothing is stored.
 */
const LANDING: { pathname: string; search: string } | null =
  typeof window !== "undefined" && window.location ? { pathname: window.location.pathname, search: window.location.search } : null;

/** Call once on app load (client only). No-op unless enabled at build time. */
export function trackVisit() {
  if (!ENABLED || typeof window === "undefined" || !hasStorage()) return;
  const landing = LANDING ?? { pathname: window.location.pathname, search: window.location.search };
  const params = new URLSearchParams(landing.search);
  const src = landingSource({
    utmSource: params.get("utm_source"),
    ref: params.get("ref"),
    pathname: landing.pathname,
    search: landing.search,
    referrer: document.referrer,
    ownHost: window.location.hostname,
  });
  const { state, events, bucket } = nextVisit(load(), new Date(), src, parseRef(params.get("ref")));
  try {
    localStorage.setItem(RETENTION_KEY, JSON.stringify(state));
  } catch {
    return;
  }
  for (const e of events) send(e, bucket, state.source, "none", state.ref);
}

/** Gameplay events (draft_start, sim_complete + outcome, daily_complete, share_click + via). */
export function trackEvent(event: RetentionEvent, mode: RetentionMode = "none", via?: ShareVia, outcome?: Outcome) {
  if (!ENABLED || typeof window === "undefined") return;
  const s = load();
  if (!s) return;
  send(event, bucketFor(Math.max(0, daysBetween(s.firstSeen, toDay(new Date())))), s.source, mode, s.ref, via, outcome);
}
