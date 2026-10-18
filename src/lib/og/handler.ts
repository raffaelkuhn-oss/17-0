/**
 * GET /r/<code>/og-v<N>.png — per-run preview image, rendered on the Worker from the challenge code
 * alone (nothing stored). Deterministic per code, so it is cached at the edge for good.
 * Anything invalid, an old layout version, or a render error -> 302 to the generic /og-image-v2.jpg.
 */
import atlasBin from "../../assets/og/atlas.bin";
import { OG_VERSION, RUN_OG_PATH, runFromCode, upgradedOgPath } from "./run-page";
import { renderRunPng, warmRenderer } from "./run-image";

const atlas = new Uint8Array(atlasBin);
// Warm the drawing loops at startup (global scope, sync) so the first request's CPU stays low.
warmRenderer(atlas);

type Ctx = { waitUntil(p: Promise<unknown>): void } | undefined;
type CacheStorageLike = { default: Cache };

function fallback(url: URL, reason: string): Response {
  return new Response(null, {
    status: 302,
    headers: { location: `${url.origin}/og-image-v2.jpg`, "cache-control": "public, max-age=300", "x-og-fallback": reason },
  });
}

export async function handleRunOg(request: Request, ctx: Ctx): Promise<Response> {
  const url = new URL(request.url);
  const m = RUN_OG_PATH.exec(url.pathname);
  if (!m) return fallback(url, "path");
  if (Number(m[2]) !== OG_VERSION) {
    const up = upgradedOgPath(url.pathname);
    if (up) return new Response(null, { status: 301, headers: { location: `${url.origin}${up}`, "cache-control": "public, max-age=86400" } });
    return fallback(url, "version");
  }
  const cache = (globalThis as unknown as { caches?: CacheStorageLike }).caches?.default;
  const key = new Request(`${url.origin}${url.pathname}`);
  const hit = await cache?.match(key);
  if (hit) return hit;
  const run = runFromCode(m[1]!);
  if (!run) return fallback(url, "invalid");
  let png: Uint8Array;
  try {
    png = await renderRunPng(run.picks, run.campaign, atlas);
  } catch (e) {
    console.error("og render failed", e);
    return fallback(url, "render");
  }
  const res = new Response(png as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
      "x-robots-tag": "noindex",
    },
  });
  if (cache) ctx?.waitUntil(cache.put(key, res.clone()));
  return res;
}
