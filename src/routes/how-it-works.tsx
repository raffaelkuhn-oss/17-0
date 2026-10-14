import { SITE_URL, absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdBanner } from "@/components/AdBanner";
import { PLAYERS } from "@/lib/players";
import { PLAYOFF_CUTOFF } from "@/lib/sim";
import { STATS } from "@/lib/chances-copy";

const URL = absUrl("/how-it-works");

const FAQ = [
  {
    q: "What is 17-0?",
    a: "17-0 is a free browser game where you draft an all-time Champions League XI and simulate a full European campaign of 17 matches. Going 17-0 means winning every match and lifting the trophy. There is no sign-up and nothing to download.",
  },
  {
    q: "Why 17 matches?",
    a: "The modern Champions League format is eight league-phase matches, followed by a knockout playoff, round of 16, quarter-final and semi-final over two legs each, and a one-off final. Eight plus eight plus one equals 17.",
  },
  {
    q: "How many players are in the legends pool?",
    a: `The pool has ${PLAYERS.length} Champions League legends across ten specific roles: goalkeeper, right back, centre back, left back, defensive midfielder, central midfielder, attacking midfielder, right winger, striker and left winger. Every player is rated for Attack, Defence, Technique and Mentality.`,
  },
  {
    q: "How is a match simulated?",
    a: "Your eleven picks are aggregated into attack, midfield and defence ratings. Those are compared to an opponent strength that rises through the league phase and again through the knockout rounds (the final is the hardest match), producing an attacking and defensive edge. Goals for both teams are then drawn from a Poisson distribution, with a mentality-based clutch bonus applied in knockout rounds.",
  },
  {
    q: "How many points do I need to survive the league phase?",
    a: `You need at least ${PLAYOFF_CUTOFF} points from the eight league-phase matches, which matches the realistic top-24 cutoff in the real competition. Draws are possible in this phase only.`,
  },
  {
    q: "What happens if a knockout tie is level?",
    a: "Two-legged ties that finish level on aggregate go to a penalty shootout weighted by your team's Mentality rating. There are no draws in the knockout phase — someone always goes through.",
  },
  {
    q: "How rare is a 17-0?",
    a: `In our simulations (${STATS.runs.toLocaleString("en-US")} runs per draft type, from the game's own engine), random picks win the title ${STATS.random.titlePct}% of the time but go a perfect 17-0 only ${STATS.random.perfectPct}% of the time. A good draft wins the title ${STATS.greedy.titlePct}% of the time and goes 17-0 ${STATS.greedy.perfectPct}% of the time. The best possible XI wins the title ${STATS.bestXI.titlePct}% of the time and goes 17-0 ${STATS.bestXI.perfectPct}% of the time. These are simulation results, not guarantees; individual runs vary a lot. See how the chances work for a plain-words explanation.`,
  },
  {
    q: "What is Legend IQ mode?",
    a: "Legend IQ hides every player rating during the draft. You pick purely from memory and reputation, then see how your XI actually performs. Classic mode shows all the numbers.",
  },
  {
    q: "Is 17-0 free?",
    a: "Yes. 17-0 is completely free and has no account requirement.",
  },
];

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How the 17-0 Champions League Simulator Works" },
      {
        name: "description",
        content:
          "How 17-0 works: draft an all-time Champions League XI, simulate 8 league-phase games and four two-legged knockout rounds, and see how often a perfect 17-0 happens in our simulations.",
      },
      { property: "og:title", content: "How the 17-0 Champions League Simulator Works" },
      { name: "twitter:title", content: "How the 17-0 Champions League Simulator Works" },
      {
        property: "og:description",
        content:
          "The full explanation of the 17-match format, player ratings, the simulation maths and how often a perfect run happens in our simulations.",
      },
      {
        name: "twitter:description",
        content:
          "The full explanation of the 17-match format, player ratings, the simulation maths and how often a perfect run happens in our simulations.",
      },
      { property: "og:type", content: "article" },
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "17-0 — Champions League Draft Simulator",
          url: SITE_URL,
          description:
            "Free browser game: draft an all-time Champions League XI from 152 legends and simulate a 17-match European campaign.",
          genre: ["Sports", "Simulation", "Football"],
          gamePlatform: "Web browser",
          applicationCategory: "GameApplication",
          operatingSystem: "Any",
          inLanguage: "en",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <header className="border-b border-border pb-6">
        <p className="text-xs tracking-[0.4em] text-primary uppercase">The rules</p>
        <h1 className="mt-2 text-4xl">How the 17-0 simulator works</h1>
        <p className="mt-3 text-muted-foreground">
          17-0 is a free Champions League draft simulator. You pick eleven all-time European
          legends, one per position, and the game plays out a full campaign: eight league-phase
          matches, four two-legged knockout rounds and the final. Seventeen wins, no defeats, and
          the trophy — that is a 17-0.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/draft" className="btn-primary text-sm">
            Start a draft
          </Link>
          <Link to="/legends" className="btn-ghost text-sm">
            Browse the legends pool
          </Link>
          <Link to="/" className="btn-ghost text-sm">
            Home
          </Link>
        </div>
      </header>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl">The 17-match format</h2>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">League phase — 8 matches.</strong> Draws are
            possible here. You need {PLAYOFF_CUTOFF} points to advance, mirroring the real top-24
            cutoff. Miss it and your run ends in the league phase.
          </li>
          <li>
            <strong className="text-foreground">
              Knockout playoff, round of 16, quarter-final, semi-final.
            </strong>{" "}
            Two legs each, eight matches in total. No draws: a level aggregate goes to a penalty
            shootout weighted by your squad's Mentality.
          </li>
          <li>
            <strong className="text-foreground">The final — 1 match.</strong> Win it and the
            confetti falls. Win all seventeen and you have gone 17-0.
          </li>
        </ol>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl">Ratings and the maths</h2>
        <p className="text-muted-foreground">
          Every one of the {PLAYERS.length} legends in the pool is rated for Attack, Defence,
          Technique and Mentality, and can only be drafted into a role they actually played — a pure
          right back cannot be slotted in at centre back. Your XI is aggregated into attack,
          midfield and defence unit ratings, compared against an opponent strength that climbs
          through the league phase and again through the knockout rounds, and goals are drawn from a
          Poisson distribution based on that edge. From the knockout playoff onwards, a clutch bonus
          derived from Mentality is added.
        </p>
      </section>

      <AdBanner className="mt-10" />

      <section className="mt-10">
        <h2 className="text-2xl">Frequently asked questions</h2>
        <dl className="mt-4 divide-y divide-border">
          {FAQ.map((f) => (
            <div key={f.q} className="py-5">
              <dt className="font-semibold text-foreground">{f.q}</dt>
              <dd className="mt-2 text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
