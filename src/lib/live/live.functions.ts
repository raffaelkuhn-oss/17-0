import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Player } from "@/lib/players";
import { buildLivePlayers, isLiveEnabled, type FormState } from "./form";
import { KV_CURRENT, type KVLike } from "./update";

export type LivePool =
  | { enabled: false }
  | { enabled: true; players: Player[]; updatedAt: string | null; source: "kv" | "base" };

/** Off unless LIVE_PLAYERS_ENABLED=1, or LIVE_PLAYERS_PREVIEW=1 and the page asked with ?live=1. */
export const getLivePool = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ preview: z.boolean() }).parse(d))
  .handler(async ({ data }): Promise<LivePool> => {
    const vars = {
      LIVE_PLAYERS_ENABLED: process.env["LIVE_PLAYERS_ENABLED"],
      LIVE_PLAYERS_PREVIEW: process.env["LIVE_PLAYERS_PREVIEW"],
    };
    if (!isLiveEnabled(vars, data.preview)) return { enabled: false };
    let state: FormState | null = null;
    try {
      const { env } = await import("cloudflare:workers");
      const kv = env["LIVE_FORM"] as KVLike | undefined;
      state = kv ? ((await kv.get(KV_CURRENT, "json")) as FormState | null) : null;
    } catch (e) {
      console.error("live form read failed; using base ratings", e);
    }
    return { enabled: true, players: buildLivePlayers(state), updatedAt: state?.updatedAt ?? null, source: state ? "kv" : "base" };
  });
