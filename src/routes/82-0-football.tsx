import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://ucl-17-0.lovable.app/82-0-football";
const TITLE = "82-0 for Football — The Champions League Version (17-0)";
const DESC =
  "Love 82-0? 17-0 is the football alternative: draft an all-time Champions League XI and simulate 17 matches to chase a perfect unbeaten season. Free, no sign-up.";

export const Route = createFileRoute("/82-0-football")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Page,
});

const ROWS = [
  ["Sport", "Basketball (NBA)", "Football (Champions League)"],
  ["Perfect season", "82-0", "17-0"],
  ["Squad size", "Starting five", "Starting XI, one per position"],
  ["Season format", "82 regular-season games", "8 league-phase games + 4 two-legged knockout ties + final"],
  ["Draws", "No", "Yes, in the league phase"],
  ["Daily challenge", "Yes", "Yes, with a global name leaderboard"],
  ["Price", "Free", "Free, no sign-up"],
];

function Page() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">The football alternative</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">82-0, but for football</h1>
      <p className="mt-5 text-lg text-muted-foreground">
        82-0 asks if your drafted NBA team can win every game of a season. 17-0 takes the same idea
        to European football: pick an all-time Champions League XI from legends like Messi, Ronaldo,
        Maldini and Zidane, then simulate the whole campaign. Lose once and the perfect run is gone.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/draft" search={{ mode: "classic" }} className="btn-primary hover:btn-primary-hover">
          Play 17-0 now
        </Link>
        <Link to="/daily" className="btn-ghost">
          Daily challenge
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl">82-0 vs 17-0 at a glance</h2>
        <div className="surface mt-5 overflow-x-auto rounded-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-3"></th>
                <th className="p-3">82-0</th>
                <th className="p-3">17-0</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([k, a, b]) => (
                <tr key={k} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted-foreground">{k}</td>
                  <td className="p-3">{a}</td>
                  <td className="p-3">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Where 82-0 wins: a longer season and the NBA crowd. Where 17-0 differs: knockout ties can
          end your run in one bad night, so even a top XI goes 17-0 only around 1–2% of the time.
        </p>
      </section>

      <section className="mt-14 border-t border-border pt-8">
        <h2 className="text-2xl">Learn more</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/how-it-works" className="btn-ghost text-sm">How the simulation works</Link>
          <Link to="/best-xi-of-all-time" className="btn-ghost text-sm">Best XI of all time</Link>
          <Link to="/legends" className="btn-ghost text-sm">All legends and stats</Link>
        </div>
      </section>
    </main>
  );
}
