import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dailyKey } from "@/lib/daily";
import {
  createDailyCookie,
  DAILY_COOKIE,
  newCookieId,
  verifyDailyCookie,
  type DailyCookie,
  type DailyCookieState,
} from "@/lib/daily-cookie";

const dayInput = z.object({ dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** Missing secret => cookie features are off and callers fall back to localStorage only. */
export const dailySecret = () => process.env["DAILY_COOKIE_SECRET"] || undefined;

/** Reads and verifies the request cookie for the given day. Null if absent/invalid/no secret. */
export async function readDailyCookie(dayKey: string): Promise<DailyCookie | null> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const c = await verifyDailyCookie(dailySecret(), getCookie(DAILY_COOKIE));
  return c && c.dayKey === dayKey ? c : null;
}

/** Sets (or upgrades) the signed httpOnly cookie. Silently does nothing without a secret. */
export async function writeDailyCookie(dayKey: string, state: DailyCookieState): Promise<boolean> {
  const existing = await readDailyCookie(dayKey);
  const value = await createDailyCookie(dailySecret(), {
    dayKey,
    state: existing?.state === "b" ? "b" : state,
    id: existing?.id ?? newCookieId(),
  });
  if (!value) return false;
  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie(DAILY_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: 60 * 60 * 36,
  });
  return true;
}

/** Has this browser already completed today's daily (per the signed cookie)? */
export const getDailyPlayedStatus = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => dayInput.parse(data))
  .handler(async ({ data }) => {
    if (data.dayKey !== dailyKey()) return { played: false as const };
    const c = await readDailyCookie(data.dayKey);
    return { played: c !== null };
  });

/** Called when a daily run finishes. Best-effort; never throws. */
export const markDailyCompleted = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dayInput.parse(data))
  .handler(async ({ data }) => {
    if (data.dayKey !== dailyKey()) return { ok: false as const };
    try {
      return { ok: await writeDailyCookie(data.dayKey, "c") };
    } catch (e) {
      console.error("daily cookie set failed", e);
      return { ok: false as const };
    }
  });
