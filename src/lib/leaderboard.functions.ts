import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dailyKey } from "@/lib/daily";
import { overall } from "@/lib/players";
import { readDailyCookie, writeDailyCookie } from "@/lib/daily-cookie.functions";
import { readDailyLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard-read";

export type { LeaderboardEntry };

const inputSchema = z.object({
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(2).max(20),
  picks: z.array(z.string().min(1).max(60)).length(11),
});

export const submitDailyResult = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    // Only today's puzzle can be submitted.
    if (data.dayKey !== dailyKey()) {
      return { ok: false as const, error: "That daily challenge has closed." };
    }

    const name = data.name.replace(/\s+/g, " ").trim().slice(0, 20);
    if (name.length < 2) return { ok: false as const, error: "Pick a longer name." };

    // Authoritative result: recompute from seed + pool. During the post-deploy
    // grace window, drafts started on the old client (v1 pool + pre-version seed)
    // still resolve; new dailies always use the current pool.
    // Server-only module (keeps the frozen v1 pool out of the client bundle).
    const { resolveDailyDraft } = await import("@/lib/daily-draft.server");
    const resolved = resolveDailyDraft(data.picks, data.dayKey);
    if (!resolved) {
      return { ok: false as const, error: "That squad is not a valid draft for today." };
    }
    const { picks, campaign } = resolved;
    const rating = Math.round(picks.reduce((s, p) => s + overall(p), 0) / picks.length);

    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return { ok: false as const, error: "The leaderboard is not available right now." };
    }
    // One leaderboard entry per day per browser (signed cookie). A deterrent only:
    // without accounts, clearing cookies resets it. No-op if DAILY_COOKIE_SECRET is unset.
    const prior = await readDailyCookie(data.dayKey);
    if (prior?.state === "b") {
      return { ok: false as const, error: "You've already submitted today's result." };
    }

    const { error } = await supabaseAdmin.from("daily_leaderboard").insert({
      day_key: data.dayKey,
      name,
      won: campaign.won,
      drawn: campaign.drawn,
      lost: campaign.lost,
      points: campaign.points,
      rating,
      champion: campaign.champion,
      perfect: campaign.perfect,
      eliminated_in: campaign.eliminatedIn,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "That name is already on today's board." };
      }
      console.error("daily leaderboard insert failed", error.message);
      return { ok: false as const, error: "Could not submit your result. Try again." };
    }

    try {
      await writeDailyCookie(data.dayKey, "b");
    } catch (e) {
      console.error("daily cookie set failed", e);
    }
    return { ok: true as const };
  });

/** Returns { enabled: false } when Supabase is not configured. */
export const getDailyLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    return readDailyLeaderboard(getSupabaseAdmin(), data.dayKey);
  });
