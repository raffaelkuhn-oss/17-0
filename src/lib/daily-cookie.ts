/**
 * Signed "already played" cookie for the daily challenge.
 *
 * HONESTY NOTE: there are no accounts, so this is a deterrent, not a guarantee.
 * Anyone who clears cookies AND localStorage (or uses another browser/device)
 * gets a fresh attempt. The cookie only stops casual replays and stops a user
 * from posting a second leaderboard entry from the same browser.
 *
 * NO ID: the value carries only the Daily date and a state flag, signed with HMAC.
 * Everyone who reached the same state on the same Daily gets a byte-identical cookie,
 * so it cannot single anyone out (matches the footer's "no ID" wording).
 *
 * Value format (v2): `v2.<dayKey>.<state>.<sig>` where state is
 *   "c" = daily completed, "b" = completed and submitted to the leaderboard,
 * and sig = base64url(HMAC-SHA256(secret, "v2.<dayKey>.<state>")).
 *
 * Old format (v1, until 18 Oct 2026): `v1.<dayKey>.<state>.<24-hex random id>.<sig>`.
 * A validly signed v1 cookie still counts as "played" for its day (so nobody gets a free
 * replay right after the deploy); its id is discarded and the server rewrites it as v2.
 * v1 is ignored after V1_ACCEPT_UNTIL_MS, when every v1 cookie (max-age 36 h) has expired.
 * Pure functions (WebCrypto only) so they run on Workers, Node and Bun.
 */
export const DAILY_COOKIE = "ucl170_daily";
export type DailyCookieState = "c" | "b";
export type DailyCookie = { dayKey: string; state: DailyCookieState; legacy?: true };

/** 21 Oct 2026 00:00 UTC: > 36 h after the last v1 cookie could have been set (18 Oct deploy). */
export const V1_ACCEPT_UNTIL_MS = Date.UTC(2026, 9, 21, 0, 0, 0);
/** Cookie lifetime: covers the rest of the UTC day in any time zone, then expires. */
export const DAILY_COOKIE_MAX_AGE = 60 * 60 * 36;

const enc = new TextEncoder();
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Returns the cookie value to set, or null when no secret is configured. Deterministic. */
export async function createDailyCookie(
  secret: string | undefined,
  c: { dayKey: string; state: DailyCookieState },
): Promise<string | null> {
  if (!secret || !DAY_RE.test(c.dayKey) || (c.state !== "c" && c.state !== "b")) return null;
  const payload = `v2.${c.dayKey}.${c.state}`;
  return `${payload}.${await sign(secret, payload)}`;
}

/** Returns the parsed cookie only if the signature is valid. Never throws. */
export async function verifyDailyCookie(
  secret: string | undefined,
  value: string | undefined,
  now = Date.now(),
): Promise<DailyCookie | null> {
  if (!secret || !value || value.length > 200) return null;
  try {
    const parts = value.split(".");
    if (parts[0] === "v2" && parts.length === 4) {
      const [, dayKey, state, sig] = parts as [string, string, string, string];
      if (!DAY_RE.test(dayKey) || (state !== "c" && state !== "b")) return null;
      if (!timingSafeEqual(await sign(secret, `v2.${dayKey}.${state}`), sig)) return null;
      return { dayKey, state };
    }
    if (parts[0] === "v1" && parts.length === 5 && now < V1_ACCEPT_UNTIL_MS) {
      const [, dayKey, state, id, sig] = parts as [string, string, string, string, string];
      if (!DAY_RE.test(dayKey) || (state !== "c" && state !== "b")) return null;
      if (!/^[0-9a-f]{24}$/.test(id)) return null;
      if (!timingSafeEqual(await sign(secret, `v1.${dayKey}.${state}.${id}`), sig)) return null;
      return { dayKey, state, legacy: true }; // id deliberately dropped
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Replay decision for today's Daily from the raw cookie value (pure; used by the server function).
 * played: the browser finished today's Daily (cookie for today with a valid signature).
 * upgrade: it is a valid old-format v1 cookie and should be rewritten as v2 (drops the id).
 */
export async function dailyPlayedState(
  secret: string | undefined,
  value: string | undefined,
  todayKey: string,
  now = Date.now(),
): Promise<{ played: boolean; state: DailyCookieState | null; upgrade: boolean }> {
  const c = await verifyDailyCookie(secret, value, now);
  if (!c || c.dayKey !== todayKey) return { played: false, state: null, upgrade: false };
  return { played: true, state: c.state, upgrade: c.legacy === true };
}
