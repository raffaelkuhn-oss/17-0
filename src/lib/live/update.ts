import { computeWeeklyForm, type FdMatch, type FdScorer, type FormState } from "./form";

export const KV_CURRENT = "current-form:v1";
export const KV_PREVIOUS = "current-form:v1:prev";
export const FD_BASE = "https://api.football-data.org/v4";

export type KVLike = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
};
export type LiveEnv = { FOOTBALL_DATA_API_KEY?: string; LIVE_FORM?: KVLike };

/**
 * Weekly cron job: 2 requests (scorers + finished matches since the last run), well under the
 * free tier's 10 requests/minute. Any failure keeps last week's stored ratings untouched.
 */
export async function runWeeklyUpdate(
  env: LiveEnv,
  fetchImpl: typeof fetch = fetch,
  now = new Date(),
): Promise<{ ok: boolean; reason?: string; state?: FormState }> {
  const key = env.FOOTBALL_DATA_API_KEY;
  const kv = env.LIVE_FORM;
  if (!key) return { ok: false, reason: "FOOTBALL_DATA_API_KEY not set" };
  if (!kv) return { ok: false, reason: "LIVE_FORM KV binding missing" };
  try {
    const prev = ((await kv.get(KV_CURRENT, "json")) as FormState | null) ?? null;
    const today = now.toISOString().slice(0, 10);
    const from = prev?.updatedAt.slice(0, 10) ?? new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    const headers = { "X-Auth-Token": key };
    const [sRes, mRes] = await Promise.all([
      fetchImpl(`${FD_BASE}/competitions/CL/scorers?limit=100`, { headers }),
      fetchImpl(`${FD_BASE}/competitions/CL/matches?status=FINISHED&dateFrom=${from}&dateTo=${today}`, { headers }),
    ]);
    if (!sRes.ok || !mRes.ok) return { ok: false, reason: `football-data HTTP ${sRes.status}/${mRes.status}` };
    const scorers = ((await sRes.json()) as { scorers?: FdScorer[] }).scorers ?? [];
    const matches = ((await mRes.json()) as { matches?: FdMatch[] }).matches ?? [];
    const state = computeWeeklyForm(prev, scorers, matches, now, from);
    if (prev) await kv.put(KV_PREVIOUS, JSON.stringify(prev));
    await kv.put(KV_CURRENT, JSON.stringify(state));
    return { ok: true, state };
  } catch (e) {
    console.error("live form update failed; keeping last ratings", e);
    return { ok: false, reason: String(e) };
  }
}
