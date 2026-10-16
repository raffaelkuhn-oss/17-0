import { absUrl } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { DraftGame, type Mode } from "@/components/DraftGame";
import { getLivePool } from "@/lib/live/live.functions";
import { decodeChallenge } from "@/lib/challenge";
import { useMemo } from "react";

export const Route = createFileRoute("/draft")({
  // Classic is the default and has no query param, so the canonical URL is plain /draft
  // (no redirect to ?mode=classic). Only the legend variant carries ?mode=legend.
  // ?live=1 asks for the live-players preview; the server ignores it unless LIVE_PLAYERS_PREVIEW=1.
  validateSearch: (search: Record<string, unknown>): { mode?: Mode; live?: 1; c?: string } => ({
    ...(typeof search["c"] === "string" ? { c: search["c"] } : {}),
    ...(search["mode"] === "legend" ? { mode: "legend" as const } : {}),
    ...(search["live"] === 1 || search["live"] === "1" ? { live: 1 as const } : {}),
  }),
  loaderDeps: ({ search }) => ({ live: search.live === 1 }),
  loader: ({ deps }) => getLivePool({ data: { preview: deps.live } }),
  head: () => ({
    meta: [
      { title: "Draft Room — 17-0 Champions League Draft" },
      {
        name: "description",
        content:
          "Pick your eleven from Champions League legends, then simulate all 17 matches of the campaign.",
      },
      { property: "og:title", content: "Draft Room — 17-0 Champions League Draft" },
      { name: "twitter:title", content: "Draft Room — 17-0 Champions League Draft" },
      {
        property: "og:description",
        content: "Pick eleven legends and simulate the full European campaign.",
      },
      {
        name: "twitter:description",
        content: "Pick eleven legends and simulate the full European campaign.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absUrl("/draft") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absUrl("/draft") }],
  }),
  component: DraftPage,
});

function DraftPage() {
  const { mode: urlMode = "classic", c } = Route.useSearch();
  const live = Route.useLoaderData();
  // Untrusted: anything invalid falls back to a normal draft with a neutral note.
  const challenge = useMemo(() => (c ? decodeChallenge(c) : null), [c]);
  const mode = challenge?.mode ?? urlMode;
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      {c && !challenge && (
        <p className="mb-6 text-sm text-muted-foreground" data-testid="challenge-invalid">
          This challenge link didn't work, so here is a new draft.
        </p>
      )}
      <DraftGame
        key={challenge ? c : "draft"}
        mode={mode}
        challenge={challenge ?? undefined}
        extraPool={live.enabled ? live.players : undefined}
      />
      {live.enabled && (
        <p className="mt-10 text-center text-xs text-muted-foreground" data-testid="fd-attribution">
          Includes {live.players.length} current players (marked Live).{" "}
          {live.updatedAt
            ? `Form updated ${live.updatedAt.slice(0, 10)}.`
            : "Showing base ratings (no form data yet)."}{" "}
          <a href="https://www.football-data.org" target="_blank" rel="noopener noreferrer" className="underline">
            Data provided by football-data.org
          </a>
        </p>
      )}
    </main>
  );
}
