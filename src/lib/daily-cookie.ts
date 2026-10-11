/**
 * Signed "already played" cookie for the daily challenge.
 *
 * HONESTY NOTE: there are no accounts, so this is a deterrent, not a guarantee.
 * Anyone who clears cookies AND localStorage (or uses another browser/device)
 * gets a fresh attempt. The cookie only stops casual replays and stops a user
 * from posting a second leaderboard entry from the same browser.
 *
 * Value format: `v1.<dayKey>.<state>.<id>.<sig>` where state is
 *   "c" = daily completed, "b" = completed and submitted to the leaderboard,
 * and sig = base64url(HMAC-SHA256(secret, "v1.<dayKey>.<state>.<id>")).
 * Pure functions (WebCrypto only) so they run on Workers, Node and Bun.
 */
export const DAILY_COOKIE = "ucl170_daily";
export type DailyCookieState = "c" | "b";
export type DailyCookie = { dayKey: string; state: DailyCookieState; id: string };

const enc = new TextEncoder();

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

export function newCookieId(): string {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Returns the cookie value to set, or null when no secret is configured. */
export async function createDailyCookie(
  secret: string | undefined,
  c: DailyCookie,
): Promise<string | null> {
  if (!secret) return null;
  const payload = `v1.${c.dayKey}.${c.state}.${c.id}`;
  return `${payload}.${await sign(secret, payload)}`;
}

/** Returns the parsed cookie only if the signature is valid. Never throws. */
export async function verifyDailyCookie(
  secret: string | undefined,
  value: string | undefined,
): Promise<DailyCookie | null> {
  if (!secret || !value) return null;
  try {
    const parts = value.split(".");
    if (parts.length !== 5 || parts[0] !== "v1") return null;
    const [, dayKey, state, id, sig] = parts as [string, string, string, string, string];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || (state !== "c" && state !== "b")) return null;
    if (!/^[0-9a-f]{24}$/.test(id)) return null;
    const expected = await sign(secret, `v1.${dayKey}.${state}.${id}`);
    if (!timingSafeEqual(expected, sig)) return null;
    return { dayKey, state, id };
  } catch {
    return null;
  }
}
