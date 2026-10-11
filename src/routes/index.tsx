import { SITE_URL, absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLeaderboard } from "@/components/HomeLeaderboard";
import stadium from "@/assets/stadium-hero.webp";
import { AdBanner } from "@/components/AdBanner";
import { SupportCard } from "@/components/SupportCard";
import { PLAYERS } from "@/lib/players";
import { POSITION_PAGES, POSITION_SLUGS } from "@/lib/position-pages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "17-0 — Draft the Perfect Champions League XI" },
      {
        name: "description",
        content:
          "Draft an all-time XI from Champions League legends, simulate all 17 nights of the campaign, and find out if you can go 17-0.",
      },
      { property: "og:title", content: "17-0 — Draft the Perfect Champions League XI" },
      { name: "twitter:title", content: "17-0 — Draft the Perfect Champions League XI" },
      {
        property: "og:description",
        content: "Draft legends, simulate the campaign, chase the unbeaten European treble run.",
      },
      {
        name: "twitter:description",
        content: "Draft legends, simulate the campaign, chase the unbeaten European treble run.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absUrl("/") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absUrl("/") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "17-0 — Champions League Draft Simulator",
          url: SITE_URL,
          description:
            "Free browser game: draft an all-time Champions League XI from a pool of European legends and simulate a 17-match campaign — 8 league-phase games, four two-legged knockout rounds and the final.",
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
  component: Index,
});

const MODES = [
  {
    id: "classic",
    kicker: "Full stats",
    title: "Classic",
    body: "Every attribute on the table. Build the best XI with all the numbers in front of you.",
  },
  {
    id: "legend",
    kicker: "Stats hidden",
    title: "Legend IQ",
    body: "No ratings, no help. Draft on memory alone and prove you actually watched the football.",
  },
] as const;

function Index() {
  return (
    <main className="min-h-screen">
      <section className="relative isolate overflow-hidden">
        <img
          src={stadium}
          alt="Floodlit European football stadium at night"
          width={1600}
          height={907}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 text-center sm:pt-32">
          <p className="text-xs tracking-[0.45em] text-primary uppercase">
            All-time European draft
          </p>
          <h1 className="mt-5 text-5xl leading-[0.9] sm:text-7xl">
            <span className="text-gradient">17-0</span> — Champions League Draft Simulator
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Draft an all-time XI from the Champions League legends pool, then simulate the full
            campaign: eight league-phase nights, four knockout ties and one final in May. Can your
            XI survive the whole thing unbeaten and go 17-0?
          </p>


          <Link
            to="/daily"
            className="surface mx-auto mt-9 flex max-w-3xl items-center justify-between gap-4 rounded-2xl border-primary/40 p-5 text-left transition-transform hover:-translate-y-1"
          >
            <div>
              <p className="text-[0.65rem] tracking-[0.35em] text-primary uppercase">
                New · one draft a day
              </p>
              <h2 className="mt-1 text-2xl">Daily Challenge</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Everyone in the world gets the same eleven choices. Build a streak, compare results.
              </p>
            </div>
            <span className="btn-primary hover:btn-primary-hover shrink-0 text-sm">Play today</span>
          </Link>

          <div className="mx-auto mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
            {MODES.map((m) => (
              <Link
                key={m.id}
                to="/draft"
                search={m.id === "legend" ? { mode: "legend" } : {}}
                className="surface group rounded-2xl p-6 text-left transition-transform hover:-translate-y-1"
              >
                <p className="text-[0.65rem] tracking-[0.35em] text-primary uppercase">
                  {m.kicker}
                </p>
                <h2 className="mt-2 text-3xl">{m.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{m.body}</p>
                <span className="btn-primary hover:btn-primary-hover mt-5 w-full text-sm">
                  Start draft
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6">
        <AdBanner className="mx-auto max-w-3xl" />
      </section>

      <section id="ranking" className="mx-auto max-w-2xl px-6 py-12">
        <HomeLeaderboard />
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {[
            { n: "11", l: "Picks, one per position" },
            { n: "17", l: "Matches to survive" },
            { n: `${PLAYERS.length}`, l: "European legends in the pool" },
          ].map((s) => (
            <div key={s.l} className="bg-card px-6 py-8 text-center">
              <p className="font-display text-4xl text-gradient">{s.n}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/legends" className="btn-ghost text-sm">
            Browse the legends pool
          </Link>
          <Link to="/best-xi-of-all-time" className="btn-ghost text-sm">
            Best XI of all time
          </Link>
          <Link to="/ucl-simulator" className="btn-ghost text-sm">
            Champions League simulator
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
          <Link to="/how-it-works" className="btn-ghost text-sm">
            How it works
          </Link>
          <Link to="/82-0-football" className="btn-ghost text-sm">
            82-0 for football
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 text-sm text-muted-foreground">
          {POSITION_SLUGS.map((s) => (
            <Link key={s} to="/best/$position" params={{ position: s }} className="inline-flex min-h-11 items-center hover:text-primary">
              Best UCL {POSITION_PAGES[s].label.toLowerCase()}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-4">
        <h2 className="text-2xl">What is 17-0?</h2>
        <p className="mt-3 text-muted-foreground">
          17-0 is a free Champions League draft simulator you play in the browser — no sign-up, no
          download. You draft eleven all-time European legends, one per position, then the game
          simulates the full campaign: eight league-phase matches where draws are possible, a
          knockout playoff, round of 16, quarter-final and semi-final over two legs each, and the
          final. Going 17-0 means winning all seventeen matches and lifting the trophy, which even a
          top-tier XI manages only about 1–2% of the time.{" "}
          <Link to="/how-it-works" className="text-primary underline underline-offset-4">
            Read the full rules and FAQ
          </Link>
          .
        </p>
      </section>


      <section className="mx-auto max-w-2xl px-6 pb-24">
        <SupportCard />
      </section>
    </main>
  );
}

