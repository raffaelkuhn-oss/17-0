import { absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CHANCES_INTRO, CHANCES_POINTS, CHANCE_ROWS, STATS, chanceSentence } from "@/lib/chances-copy";

const URL = absUrl("/how-the-chances-work");
const TITLE = "How the chances work in 17-0, in plain words";
const DESC = `In plain words: how 17-0 decides your matches, and your real chance to win the title or go 17-0, from ${STATS.runs.toLocaleString("en-US")} simulated seasons per draft type.`;

export const Route = createFileRoute("/how-the-chances-work")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { name: "twitter:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: HowTheChancesWork,
});

function HowTheChancesWork() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <header className="border-b border-border pb-6">
        <p className="text-xs tracking-[0.4em] text-primary uppercase">Is it fair?</p>
        <h1 className="mt-2 text-4xl">{TITLE}</h1>
        <p className="mt-3 text-muted-foreground">{CHANCES_INTRO}</p>
      </header>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl">In plain words</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          {CHANCES_POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl">Your chance, by type of draft</h2>
        <p className="text-sm text-muted-foreground">
          From {STATS.runs.toLocaleString("en-US")} simulated seasons for each draft type, using the game's own engine.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4">Draft</th>
                <th className="py-2 pr-4">Chance to win the title</th>
                <th className="py-2">Chance to go 17-0</th>
              </tr>
            </thead>
            <tbody>
              {CHANCE_ROWS.map((r) => (
                <tr key={r.key} className="border-b border-border">
                  <td className="py-2 pr-4">
                    <strong className="text-foreground">{r.label}</strong>
                    <span className="block text-xs text-muted-foreground">{r.hint}</span>
                  </td>
                  <td className="py-2 pr-4 font-display text-lg">{r.s.titlePct}%</td>
                  <td className="py-2 font-display text-lg">{r.s.perfectPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="sr-only">
          {CHANCE_ROWS.map((r) => (
            <li key={r.key}>{chanceSentence(r)}</li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/draft" className="btn-primary text-sm">Start a draft</Link>
        <Link to="/how-it-works" className="btn-ghost text-sm">Full rules</Link>
      </div>
    </main>
  );
}
