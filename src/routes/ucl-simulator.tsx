import { STATS } from "@/lib/chances-copy";
import { absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PLAYERS } from "@/lib/players";

const URL = absUrl("/ucl-simulator");

const FAQ = [
  {
    q: "What is a UCL simulator?",
    a: "A UCL simulator recreates a full UEFA Champions League campaign in software. 17-0 simulates one club's season from the inside: you draft the eleven players, and the engine plays the eight league-phase matches, the knockout playoff, round of 16, quarter-final and semi-final over two legs each, and the final.",
  },
  {
    q: "Is this Champions League simulator free?",
    a: "Yes. 17-0 runs entirely in your browser with no sign-up, no download, no account and no payment. Every mode, including the daily challenge, is free.",
  },
  {
    q: "How many matches does the simulation cover?",
    a: "Seventeen — eight league-phase fixtures under the current 36-team format, eight knockout legs across four two-legged rounds, and the one-off final.",
  },
  {
    q: "Can you lose in the group stage?",
    a: "Yes. Draws are possible in the league phase and you need 11 points to finish inside the top 24 and reach the knockout playoff. Fall short and your campaign ends there.",
  },
  {
    q: "How is each match simulated?",
    a: "Your XI produces attack, midfield, defence and mentality ratings. Those are compared against an opponent strength that rises through the league phase and again through the knockout rounds to derive scoring rates, and goals are drawn from a Poisson distribution. Knockout rounds add a clutch modifier based on mentality, and level aggregates go to a mentality-weighted penalty shootout.",
  },
  {
    q: "What does a 17-0 mean?",
    a: `Seventeen wins from seventeen matches plus the trophy. In our simulations (${STATS.runs.toLocaleString("en-US")} runs per draft type), a good draft achieves it ${STATS.greedy.perfectPct}% of the time and the best possible XI ${STATS.bestXI.perfectPct}%, versus ${STATS.random.perfectPct}% for random picks.`,
  },
];

export const Route = createFileRoute("/ucl-simulator")({
  head: () => ({
    meta: [
      { title: "Champions League Simulator — Free UCL Season Simulator" },
      {
        name: "description",
        content:
          "Free UCL simulator: draft an all-time XI and simulate a Champions League season — 8 league-phase games, 4 two-legged knockout rounds, the final. No sign-up.",
      },
      {
        property: "og:title",
        content: "Champions League Simulator — Free UCL Season Simulator",
      },
      {
        name: "twitter:title",
        content: "Champions League Simulator — Free UCL Season Simulator",
      },
      {
        property: "og:description",
        content:
          "Simulate a full 17-match Champions League campaign in your browser. Draft eleven legends, survive the league phase, win the final.",
      },
      {
        name: "twitter:description",
        content:
          "Simulate a full 17-match Champions League campaign in your browser. Draft eleven legends, survive the league phase, win the final.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: UclSimulator,
});

function UclSimulator() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">Free browser game</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">
        Champions League simulator — play a full UCL season in your browser
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        17-0 is a free Champions League simulator (UCL simulator) you play in the browser. You draft
        eleven all-time European legends, one per position, and the engine simulates the whole
        campaign under the current 36-team format: eight league-phase matches, a knockout playoff,
        round of 16, quarter-final and semi-final over two legs each, and the final. No sign-up, no
        download, no cost.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/draft" className="btn-primary hover:btn-primary-hover">
          Start simulating
        </Link>
        <Link to="/daily" className="btn-ghost">
          Today's daily challenge
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl">What the simulator covers</h2>
        <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {[
            { n: "8", l: "League-phase matches, draws possible" },
            { n: "9", l: "Knockout matches, no draws" },
            { n: `${PLAYERS.length}`, l: "European legends to draft from" },
          ].map((s) => (
            <div key={s.l} className="bg-card px-5 py-7 text-center">
              <p className="font-display text-4xl text-gradient">{s.n}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl">How the season plays out</h2>
        <ol className="mt-5 space-y-4 text-muted-foreground">
          <li>
            <strong className="text-foreground">League phase (matches 1-8).</strong> Opponent
            strength ramps from mid-table European sides up to elite clubs. Wins are worth three
            points, draws one. You need 11 points to reach the top 24 and continue.
          </li>
          <li>
            <strong className="text-foreground">
              Knockout playoff, R16, QF, SF (matches 9-16).
            </strong>{" "}
            Two legs each, decided on aggregate. Level ties go to a penalty shootout weighted by
            your squad's mentality rating.
          </li>
          <li>
            <strong className="text-foreground">The final (match 17).</strong> One match, no second
            chance, against the strongest opponent in the game.
          </li>
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl">Frequently asked questions</h2>
        <dl className="mt-5 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="text-lg text-foreground">{f.q}</dt>
              <dd className="mt-1.5 text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 border-t border-border pt-8">
        <h2 className="text-2xl">Keep going</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/best-xi-of-all-time" className="btn-ghost text-sm">
            Best XI of all time
          </Link>
          <Link to="/legends" className="btn-ghost text-sm">
            Browse the legends pool
          </Link>
          <Link to="/how-it-works" className="btn-ghost text-sm">
            The simulation maths
          </Link>
          <Link to="/football-draft-game" className="btn-ghost text-sm">
            Football draft game
          </Link>
          <Link to="/daily-football-game" className="btn-ghost text-sm">
            Daily football game
          </Link>
          <Link to="/best-champions-league-players" className="btn-ghost text-sm">
            Best UCL players ever
          </Link>
        </div>
      </section>
    </main>
  );
}
