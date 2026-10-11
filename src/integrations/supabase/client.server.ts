// Server-only Supabase admin client (service role). Returns null when the
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY secrets are not configured, so the
// leaderboard can be disabled gracefully instead of crashing.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let cached: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseAdmin() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  cached ??= createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
