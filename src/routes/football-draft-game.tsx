import { STATS } from "@/lib/chances-copy";
import { absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PLAYERS } from "@/lib/players";

const URL = absUrl("/football-draft-game");

const FAQ = [
  {
    q: "What is a football draft game?",
    a: "A football draft game lets you pick players one by one to build a squad, then tests that squad against a challenge. In 17-0 you draft eleven all-time Champions League legends, one per position, and a simulation engine plays a full 17-match European campaign with your team.",
  },
  {
    q: "Is 17-0 a free football draft game?",
    a: "Yes. It runs in your browser with no sign-up, no download and no payment. Both draft modes and the daily challenge are free.",
  },
  {
    q: "What is the difference between Classic and Legend IQ mode?",
    a: "In Classic mode you see every player's ratings before you pick. In Legend IQ mode the ratings are hidden, so you draft on football knowledge alone — the mode rewards fans who know their history.",
  },
  {
    q: "How is the draft scored?",
    a: `Your XI produces attack, midfield, defence and mentality ratings. The engine simulates eight league-phase matches, four two-legged knockout rounds and the final. Winning all seventeen matches — a 17-0 — is rare. In the game's own simulations, a good draft goes 17-0 ${STATS.greedy.perfectPct}% of the time and the highest-rated XI (top-rated legend in each slot) ${STATS.bestXI.perfectPct}%, versus ${STATS.random.perfectPct}% for random picks.`,
  },
];

export const Route = createFileRoute("/football-draft-game")({
  head: () => ({
    meta: [
      { title: "Football Draft Game — Draft All-Time Legends | 17-0 Draft" },
      {
        name: "description",
        content:
          "Free football draft game in your browser: pick eleven Champions League legends, one per position, and simulate a full 17-match season. No sign-up, no download.",
      },
      {
        property: "og:title",
        content: "Football Draft Game — Draft All-Time Legends | 17-0 Draft",
      },
      {
        name: "twitter:title",
        content: "Football Draft Game — Draft All-Time Legends | 17-0 Draft",
      },
      {
        property: "og:description",
        content:
          "Draft eleven all-time Champions League legends and simulate the whole campaign. Free, in your browser, no account.",
      },
      {
        name: "twitter:description",
        content:
          "Draft eleven all-time Champions League legends and simulate the whole campaign. Free, in your browser, no account.",
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
  component: FootballDraftGame,
});

function FootballDraftGame() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">Free browser game</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">
        Football draft game — build an all-time XI and survive 17 matches
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        17-0 is a free football draft game you play in the browser. The pool holds {PLAYERS.length}{" "}
        all-time Champions League legends. You draft one player per position — goalkeeper, back
        four, midfield three, front three — and the simulation engine plays a full European season
        with your squad. Most draft games stop at the picking; this one makes your draft prove
        itself on the pitch.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/draft" className="btn-primary hover:btn-primary-hover">
          Start drafting
        </Link>
        <Link to="/daily" className="btn-ghost">
          Today's daily challenge
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl">How a draft works</h2>
        <ol className="mt-5 space-y-4 text-muted-foreground">
          <li>
            <strong className="text-foreground">Pick eleven, one per slot.</strong> Each position
            draws from its own pool — right backs stay at right back, so your draft is a real
            tactical puzzle, not a list of strikers.
          </li>
          <li>
            <strong className="text-foreground">Ratings become a team.</strong> Attack, defence,
            technique and big-game mentality blend into squad ratings that drive the{" "}
            <Link to="/ucl-simulator" className="text-primary underline underline-offset-4">
              Champions League simulator
            </Link>
            .
          </li>
          <li>
            <strong className="text-foreground">The season decides.</strong> Eight league-phase
            matches with draws, then two-legged knockouts where only wins keep you alive. The maths
            is on the{" "}
            <Link to="/how-it-works" className="text-primary underline underline-offset-4">
              how it works
            </Link>{" "}
            page.
          </li>
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl">Two ways to draft</h2>
        <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          <div className="bg-card px-5 py-7">
            <p className="font-display text-2xl text-gradient">Classic</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Every rating visible. Build the statistically perfect XI and chase the rare 17-0.
            </p>
          </div>
          <div className="bg-card px-5 py-7">
            <p className="font-display text-2xl text-gradient">Legend IQ</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ratings hidden. Draft from memory and find out how well you actually know European
              football history.
            </p>
          </div>
        </div>
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
          <Link to="/82-0-football" className="btn-ghost text-sm">
            82-0, but for football
          </Link>
          <Link to="/daily-football-game" className="btn-ghost text-sm">
            Daily football game
          </Link>
        </div>
      </section>
    </main>
  );
}
