import { trafficFor } from "./traffic";
import { BUCKETS, MODES, REFS, RETENTION_EVENTS, SOURCES } from "./retention";

/** Minimal Workers Analytics Engine binding shape (avoids depending on generated types). */
export type AnalyticsEngineLike = {
  writeDataPoint(p: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
};

const has = (list: readonly string[], v: unknown): v is string => typeof v === "string" && list.includes(v);

/**
 * POST /e handler. Writes one aggregate data point: blobs [event, bucket, mode, source, ref, traffic],
 * double 1. traffic is "internal" when the user agent carries our fixed test marker (see traffic.ts),
 * else "public". Never stores IP, user agent, cookies or any identifier.
 * Returns 204 in every case (including when the RETENTION binding is missing).
 */
export async function handleRetentionEvent(request: Request, env: unknown): Promise<Response> {
  const done = new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const ds = (env as { RETENTION?: AnalyticsEngineLike } | undefined)?.RETENTION;
  if (!ds || typeof ds.writeDataPoint !== "function") return done;
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 512) return done;
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return done;
  }
  const { event, bucket, mode, source, ref } = body;
  if (!has(RETENTION_EVENTS, event) || !has(BUCKETS, bucket) || !has(SOURCES, source)) return done;
  const m = has(MODES, mode) ? mode : "none";
  const r = has(REFS, ref) ? ref : "none";
  try {
    ds.writeDataPoint({ blobs: [event, bucket, m, source, r, trafficFor(request.headers.get("user-agent"))], doubles: [1], indexes: [event] });
  } catch (e) {
    console.error("retention write failed", e);
  }
  return done;
}
