import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleRetentionEvent } from "./lib/retention-server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.hostname === "www.ucl17-0.com") {
      return Response.redirect(`https://ucl17-0.com${url.pathname}${url.search}`, 301);
    }
    const noindex = url.hostname.endsWith(".workers.dev");
    // Anonymous retention counters (no-op without the RETENTION Analytics Engine binding).
    const res = url.pathname === "/e" ? await handleRetentionEvent(request, env) : await handle(request, env, ctx);
    if (!noindex) return res;
    const out = new Response(res.body, res);
    out.headers.set("X-Robots-Tag", "noindex, nofollow");
    return out;
  },
  // Weekly live-form job (feature-flagged). Only runs if a cron trigger is configured AND
  // FOOTBALL_DATA_API_KEY + the LIVE_FORM KV binding exist; otherwise it logs and returns.
  async scheduled(_controller: unknown, env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const { runWeeklyUpdate } = await import("./lib/live/update");
    ctx.waitUntil(
      runWeeklyUpdate(env as Parameters<typeof runWeeklyUpdate>[0]).then((r) =>
        console.log("live form update", r.ok ? "ok" : r.reason),
      ),
    );
  },
};

const handle = async (request: Request, env: unknown, ctx: unknown): Promise<Response> => {
  {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  }
};
