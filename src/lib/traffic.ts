/**
 * Internal (our own) traffic marker. Scripted checks and headless runs send a fixed
 * user-agent token; the Worker maps it to blob6 = "internal" on /e events.
 * The user agent is only tested for this token (and the default headless-Chromium
 * signature); it is never stored or logged. No personal data.
 */
export const INTERNAL_UA_TOKEN = "ucl170-internal-check";

export type Traffic = "public" | "internal";

export function trafficFor(userAgent: string | null | undefined): Traffic {
  const ua = userAgent ?? "";
  return ua.includes(INTERNAL_UA_TOKEN) || ua.includes("HeadlessChrome") ? "internal" : "public";
}
