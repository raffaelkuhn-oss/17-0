// Leaderboard read, framework-free so it can be tested (scripts/test-leaderboard-hidden.ts).
// With no client (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing) it returns { enabled: false }
// before any request: nothing is sent to the leaderboard backend.

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

type Rows = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
type Query = {
  select(cols: string): Query;
  eq(col: string, v: string): Query;
  order(col: string, o: { ascending: boolean }): Query;
  limit(n: number): Rows;
};
export type LeaderboardDb = { from(table: "daily_leaderboard"): unknown };

export type LeaderboardRead = { enabled: boolean; entries: LeaderboardEntry[] };

export async function readDailyLeaderboard(db: LeaderboardDb | null, dayKey: string): Promise<LeaderboardRead> {
  if (!db) return { enabled: false, entries: [] };
  const { data: rows, error } = await (db.from("daily_leaderboard") as Query)
    .select("id,name,won,drawn,lost,points,rating,champion,perfect,eliminated_in")
    .eq("day_key", dayKey)
    .order("champion", { ascending: false })
    .order("won", { ascending: false })
    .order("points", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("daily leaderboard read failed", error.message);
    return { enabled: false, entries: [] };
  }
  return { enabled: true, entries: (rows ?? []) as LeaderboardEntry[] };
}
