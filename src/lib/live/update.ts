import { computeWeeklyForm, type FdMatch, type FdScorer, type FormState } from "./form";

export const KV_CURRENT = "current-form:v1";
export const KV_PREVIOUS = "current-form:v1:prev";
export const FD_BASE = "https://api.football-data.org/v4";

export type KVLike = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
};
/** How a football-data.org response failed. 403/429 = we are blocked (bad/over-quota key, free-tier
 * limit, or the egress IP is refused); 404 = the resource does not exist; anything else = error. */
export type UpstreamClass = "ok" | "blocked" | "not_found" | "error";
export function classifyUpstream(status: number): UpstreamClass {
  if (status >= 200 && status < 300) return "ok";
  if (status === 403 || status === 429) return "blocked";
  if (status === 404) return "not_found";
  return "error";
}
const worst = (a: UpstreamClass, b: UpstreamClass): UpstreamClass => {
  const rank: UpstreamClass[] = ["ok", "not_found", "error", "blocked"];
  return rank.indexOf(a) >= rank.indexOf(b) ? a : b;
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
): Promise<{ ok: boolean; reason?: string; upstream?: UpstreamClass; state?: FormState }> {
  // Trim like deploy does: a pasted secret with a trailing newline gives a 400/403 that looks "blocked".
  const key = env.FOOTBALL_DATA_API_KEY?.trim();
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
    if (!sRes.ok || !mRes.ok) {
      // Nothing is written: readers keep the last good KV state, or the base ratings if there is none.
      const upstream = worst(classifyUpstream(sRes.status), classifyUpstream(mRes.status));
      const reason = `football-data ${upstream} (HTTP scorers=${sRes.status} matches=${mRes.status}); keeping last ratings`;
      console.warn("live form update", reason, "retry-after:", sRes.headers.get("retry-after") ?? mRes.headers.get("retry-after") ?? "-");
      return { ok: false, upstream, reason };
    }
    const scorers = ((await sRes.json()) as { scorers?: FdScorer[] }).scorers ?? [];
    const matches = ((await mRes.json()) as { matches?: FdMatch[] }).matches ?? [];
    const state = computeWeeklyForm(prev, scorers, matches, now, from);
    if (prev) await kv.put(KV_PREVIOUS, JSON.stringify(prev));
    await kv.put(KV_CURRENT, JSON.stringify(state));
    return { ok: true, upstream: "ok", state };
  } catch (e) {
    console.error("live form update failed; keeping last ratings", e);
    return { ok: false, upstream: "error", reason: String(e) };
  }
}
