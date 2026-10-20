import { SITE_URL, absUrl } from "@/lib/site";
import { HOME_DESCRIPTION, HOME_TITLE } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLeaderboard } from "@/components/HomeLeaderboard";
import { AdBanner } from "@/components/AdBanner";
import { SupportCard } from "@/components/SupportCard";
import { PLAYERS } from "@/lib/players";
import { STATS } from "@/lib/chances-copy";
import { POSITION_PAGES, POSITION_SLUGS } from "@/lib/position-pages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESCRIPTION },
      { property: "og:title", content: HOME_TITLE },
      { name: "twitter:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESCRIPTION },
      { name: "twitter:description", content: HOME_DESCRIPTION },
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
          name: "17-0 Draft — Champions League Draft Simulator",
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

function Index() {
  return (
    <main className="min-h-screen">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 text-center sm:pt-32">
          <p className="text-xs tracking-[0.45em] text-primary uppercase">
            Free Champions League draft game
          </p>
          <h1 className="mt-5 text-[clamp(1.875rem,8.4vw,3rem)] leading-[0.95] sm:text-7xl">
            Draft 11 legends.{" "}
            <span className="whitespace-nowrap">
              Win all <span className="text-gradient">17</span>.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Build your all-time Champions League XI and sim a full season. Free,{" "}
            <span className="whitespace-nowrap">no sign-up.</span> Can you go 17-0?
          </p>

          {/* The only filled, high-contrast button on the page (copy-final.md #1). */}
          <Link
            to="/daily"
            className="btn-primary hover:btn-primary-hover mx-auto mt-9 w-full max-w-sm"
            data-testid="hero-daily-cta"
          >
            Play today's Daily
          </Link>
          {/* "every day", not "at midnight": the Daily resets at 00:00 UTC (src/lib/daily.ts),
              not at the visitor's local midnight, and no local-time countdown is shown yet. */}
          {/* Two lines with no dot when the full line doesn't fit (so "·" never dangles at a wrap, like the
              result screen); one line with the dot when it does. Container query in em (the <p>'s own
              font size), so it follows the real text width: 28em = 392 px at 14 px vs ~384 px of text. */}
          <p className="@container mt-3 text-sm text-muted-foreground" data-testid="hero-subline">
            <span className="block @min-[28em]:inline">Same first picks for everyone today</span>
            <span className="hidden @min-[28em]:inline"> · </span>
            <span className="block @min-[28em]:inline">new Daily every day</span>
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-1 text-sm">
            <Link
              to="/draft"
              className="inline-flex min-h-11 items-center px-3 text-primary underline-offset-4 hover:underline"
            >
              Classic draft
            </Link>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <Link
              to="/draft"
              search={{ mode: "legend" }}
              className="inline-flex min-h-11 items-center px-3 text-primary underline-offset-4 hover:underline"
            >
              Legend IQ
            </Link>
          </div>
        </div>
      </section>

      {/* Renders its own section, or nothing when the leaderboard is not configured. */}
      <HomeLeaderboard />

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
            <Link
              key={s}
              to="/best/$position"
              params={{ position: s }}
              className="inline-flex min-h-11 items-center hover:text-primary"
            >
              Best UCL {POSITION_PAGES[s].label.toLowerCase()}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-12">
        <AdBanner className="mx-auto max-w-3xl" />
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-4">
        <h2 className="text-2xl">What is 17-0?</h2>
        <p className="mt-3 text-muted-foreground">
          17-0 is a free Champions League draft simulator you play in the browser — no sign-up, no
          download. You draft eleven all-time European legends, one per position, then the game
          simulates the full campaign: eight league-phase matches where draws are possible, a
          knockout playoff, round of 16, quarter-final and semi-final over two legs each, and the
          final. Going 17-0 means winning all seventeen matches and lifting the trophy, which is
          rare: in our simulations, about {STATS.greedy.perfectPct.toFixed(1)}% of good drafts and about{" "}
          {STATS.bestXI.perfectPct.toFixed(1)}% of the best possible XI go 17-0 (random picks:{" "}
          {STATS.random.perfectPct}%).{" "}
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
