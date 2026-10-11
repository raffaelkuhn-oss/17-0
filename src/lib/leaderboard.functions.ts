import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dailyKey, dailySeed } from "@/lib/daily";
import { FORMATION, overall, type Player } from "@/lib/players";
import { candidatesFor, simulate } from "@/lib/sim";

const inputSchema = z.object({
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(2).max(20),
  picks: z.array(z.string().min(1).max(60)).length(11),
});

function rngFactory(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Replays the draft server-side: every pick must have been one of the four
 * candidates offered for that slot by today's deterministic seed.
 */
function verifyDraft(names: string[], seed: number): Player[] | null {
  const picks: Player[] = [];
  for (let step = 0; step < FORMATION.length; step++) {
    const slot = FORMATION[step]!;
    const taken = new Set(picks.map((p) => p.id));
    const offered = candidatesFor(slot.role, taken, 4, rngFactory(seed + step * 7919));
    const chosen = offered.find((p) => p.name === names[step]);
    if (!chosen) return null;
    picks.push(chosen);
  }
  return picks;
}

export const submitDailyResult = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    // Only today's puzzle can be submitted.
    if (data.dayKey !== dailyKey()) {
      return { ok: false as const, error: "That daily challenge has closed." };
    }

    const name = data.name.replace(/\s+/g, " ").trim().slice(0, 20);
    if (name.length < 2) return { ok: false as const, error: "Pick a longer name." };

    const seed = dailySeed(data.dayKey);
    const picks = verifyDraft(data.picks, seed);
    if (!picks) {
      return { ok: false as const, error: "That squad is not a valid draft for today." };
    }

    // Authoritative result: the daily campaign is deterministic for a given
    // squad + day seed, so the server recomputes it instead of trusting input.
    const campaign = simulate(picks, seed);
    const rating = Math.round(picks.reduce((s, p) => s + overall(p), 0) / picks.length);

    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return { ok: false as const, error: "The leaderboard is not available right now." };
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

    return { ok: true as const };
  });

export type LeaderboardEntry = {
  id: string;
  name: string;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  rating: number;
  champion: boolean;
  perfect: boolean;
  eliminated_in: string | null;
};

/** Returns { enabled: false } when Supabase is not configured. */
export const getDailyLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = getSupabaseAdmin();
    if (!db) return { enabled: false as const, entries: [] as LeaderboardEntry[] };
    const { data: rows, error } = await db
      .from("daily_leaderboard")
      .select("id,name,won,drawn,lost,points,rating,champion,perfect,eliminated_in")
      .eq("day_key", data.dayKey)
      .order("champion", { ascending: false })
      .order("won", { ascending: false })
      .order("points", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      console.error("daily leaderboard read failed", error.message);
      return { enabled: false as const, entries: [] as LeaderboardEntry[] };
    }
    return { enabled: true as const, entries: (rows ?? []) as LeaderboardEntry[] };
  });
