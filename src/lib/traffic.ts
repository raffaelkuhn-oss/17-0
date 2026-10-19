/**
 * Traffic class for /e events (blob6). The user agent is only tested against fixed patterns here;
 * it is never stored or logged, and nothing new is collected: the result is one value from a closed
 * list. No personal data.
 * - "internal": our own scripted checks (fixed UA token) and the default headless-Chromium signature.
 * - "bot": self-declared crawlers / automation libraries (e.g. "Googlebot/2.1", "bingbot/2.0",
 *   "GPTBot/1.0", "Bytespider", "facebookexternalhit", Lighthouse). Real browsers never send these.
 *   Deliberately narrow: "bot" must be followed by "/" (crawler version), so phone models such as
 *   "CUBOT P50" stay public.
 * - "public": everything else.
 */
export const INTERNAL_UA_TOKEN = "ucl170-internal-check";

export type Traffic = "public" | "internal" | "bot";

/** Self-declared crawler / automation user agents (case-insensitive). */
export const BOT_UA =
  /bot\/\d|spider|crawler|slurp|facebookexternalhit|bingpreview|lighthouse|pagespeed|gtmetrix|phantomjs|puppeteer|selenium|python-requests|python-urllib|go-http-client|okhttp|\bcurl\/|\bwget\//i;

export function trafficFor(userAgent: string | null | undefined): Traffic {
  const ua = userAgent ?? "";
  if (ua.includes(INTERNAL_UA_TOKEN) || ua.includes("HeadlessChrome")) return "internal";
  return BOT_UA.test(ua) ? "bot" : "public";
}
