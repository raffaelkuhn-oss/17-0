import { absUrl } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import { DraftGame, type Mode } from "@/components/DraftGame";

export const Route = createFileRoute("/draft")({
  // Classic is the default and has no query param, so the canonical URL is plain /draft
  // (no redirect to ?mode=classic). Only the legend variant carries ?mode=legend.
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } =>
    search["mode"] === "legend" ? { mode: "legend" } : {},
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
  const { mode = "classic" } = Route.useSearch();
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <DraftGame mode={mode} />
    </main>
  );
}
