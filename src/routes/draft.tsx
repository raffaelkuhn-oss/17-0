import { createFileRoute } from "@tanstack/react-router";
import { DraftGame, type Mode } from "@/components/DraftGame";

export const Route = createFileRoute("/draft")({
  validateSearch: (search: Record<string, unknown>): { mode: Mode } => ({
    mode: search["mode"] === "legend" ? "legend" : "classic",
  }),
  head: () => ({
    meta: [
      { title: "Draft Room — 17-0 Champions League Draft" },
      {
        name: "description",
        content:
          "Pick your eleven from Champions League legends, then simulate all 17 matches of the campaign.",
      },
      { property: "og:title", content: "Draft Room — 17-0 Champions League Draft" },
      {
        property: "og:description",
        content: "Pick eleven legends and simulate the full European campaign.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ucl-17-0.lovable.app/draft" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://ucl-17-0.lovable.app/draft" }],
  }),
  component: DraftPage,
});

function DraftPage() {
  const { mode } = Route.useSearch();
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <DraftGame mode={mode} />
    </main>
  );
}
