import { absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";

const URL = absUrl("/daily-football-game");

const FAQ = [
  {
    q: "What is the 17-0 daily football game?",
    a: "Every day all players worldwide get the same randomised draft pool of Champions League legends. You draft one XI, the season is simulated once, and your result goes on the daily leaderboard under a name you choose.",
  },
  {
    q: "Do I need an account for the daily challenge?",
    a: "No. Play the draft, then type any name to post your result to the leaderboard. No email, no password.",
  },
  {
    q: "When does the daily challenge reset?",
    a: "At midnight UTC. A new pool is generated for everyone at the same moment, so the leaderboard is always a fair comparison.",
  },
  {
    q: "How is the daily leaderboard ranked?",
    a: "By how far your XI went in the simulated season — wins, draws and the round you reached. The server re-simulates your exact draft before accepting a score, so leaderboard entries cannot be faked.",
  },
];

export const Route = createFileRoute("/daily-football-game")({
  head: () => ({
    meta: [
      { title: "Daily Football Game — One Champions League Draft a Day | 17-0 Draft" },
      {
        name: "description",
        content:
          "A daily football game for Champions League fans: everyone gets the same legend pool, drafts one XI, and the simulation decides. Free, no account, new challenge every day.",
      },
      { property: "og:title", content: "Daily Football Game — One Champions League Draft a Day | 17-0 Draft" },
      { name: "twitter:title", content: "Daily Football Game — One Champions League Draft a Day | 17-0 Draft" },
      {
        property: "og:description",
        content:
          "Same draft pool for everyone, one XI, one simulated season. Post your score to the daily leaderboard — free, no account.",
      },
      {
        name: "twitter:description",
        content:
          "Same draft pool for everyone, one XI, one simulated season. Post your score to the daily leaderboard — free, no account.",
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
  component: DailyFootballGame,
});

function DailyFootballGame() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">New every day</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">
        A daily football game where everyone drafts from the same pool
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        The 17-0 daily challenge is a daily football game in the Wordle mould: one puzzle per day,
        the same for every player on earth. A fresh pool of Champions League legends is drawn at
        midnight UTC, you draft your eleven, and the{" "}
        <Link to="/ucl-simulator" className="text-primary underline underline-offset-4">
          Champions League simulator
        </Link>{" "}
        plays your season once. Then you post the result to the leaderboard and see how your
        football knowledge stacked up.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/daily" className="btn-primary hover:btn-primary-hover">
          Play today's challenge
        </Link>
        <Link to="/draft" className="btn-ghost">
          Unlimited classic draft
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl">Why one draft a day works</h2>
        <ol className="mt-5 space-y-4 text-muted-foreground">
          <li>
            <strong className="text-foreground">Same pool, same chances.</strong> Nobody can reroll
            for a better draw. The leaderboard measures drafting skill, not luck of the pool.
          </li>
          <li>
            <strong className="text-foreground">Thirty seconds to play.</strong> Eleven picks, one
            simulated season, one score. It fits between matches on a Champions League night.
          </li>
          <li>
            <strong className="text-foreground">Verified scores.</strong> The server re-runs your
            draft before posting, so the names above you earned it.
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
          <Link to="/football-draft-game" className="btn-ghost text-sm">
            Football draft game
          </Link>
          <Link to="/best-xi-of-all-time" className="btn-ghost text-sm">
            Best XI of all time
          </Link>
          <Link to="/legends" className="btn-ghost text-sm">
            Full legends pool
          </Link>
          <Link to="/how-it-works" className="btn-ghost text-sm">
            How the simulation works
          </Link>
        </div>
      </section>
    </main>
  );
}
