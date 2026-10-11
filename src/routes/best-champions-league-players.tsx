import { absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { overall, PLAYERS, ROLE_LABEL } from "@/lib/players";
import { POSITION_PAGES, POSITION_SLUGS } from "@/lib/position-pages";

const URL = absUrl("/best-champions-league-players");

export const Route = createFileRoute("/best-champions-league-players")({
  head: () => ({
    meta: [
      { title: "Best Champions League Players of All Time (Top 25 Ranked) | 17-0" },
      {
        name: "description",
        content:
          "The 25 best Champions League players of all time, ranked by attack, defence, technique and big-game mentality — from a pool of 150+ European legends you can draft in the free 17-0 game.",
      },
      { property: "og:title", content: "Best Champions League Players of All Time (Top 25 Ranked) | 17-0" },
      {
        property: "og:description",
        content:
          "The 25 greatest Champions League players ever, ranked across four ratings. Draft them yourself in the free 17-0 simulator.",
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
          "@type": "ItemList",
          name: "Best Champions League players of all time",
          itemListElement: PLAYERS.slice()
            .sort((a, b) => overall(b) - overall(a))
            .slice(0, 25)
            .map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: p.name,
            })),
        }),
      },
    ],
  }),
  component: BestPlayers,
});

function BestPlayers() {
  const ranked = PLAYERS.slice()
    .sort((a, b) => overall(b) - overall(a))
    .slice(0, 25);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">All-time rankings</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">
        The best Champions League players of all time, ranked
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        Every legend in the 17-0 pool is rated on attack, defence, technique and big-game
        mentality. These are the top {ranked.length} by overall rating — the players everyone
        wants first in a draft. Disagree with the order?{" "}
        <Link to="/draft" className="text-primary underline underline-offset-4">
          Draft your own XI
        </Link>{" "}
        and let the simulation settle it.
      </p>

      <ol className="mt-10 space-y-2">
        {ranked.map((p, i) => (
          <li key={p.id} className="surface flex items-center justify-between gap-4 rounded-xl px-4 py-3">
            <div>
              <p className="text-[0.65rem] tracking-[0.25em] text-muted-foreground uppercase">
                #{i + 1} · {p.roles.map((r) => ROLE_LABEL[r]).join(" / ")}
              </p>
              <p className="text-lg">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {p.club} · {p.era} · ATT {p.att} · DEF {p.def} · TEC {p.tec} · MEN {p.men}
              </p>
            </div>
            <span className="font-display text-3xl text-gradient">{overall(p)}</span>
          </li>
        ))}
      </ol>

      <section className="mt-14 border-t border-border pt-8">
        <h2 className="text-2xl">Rankings by position</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {POSITION_SLUGS.map((s) => (
            <Link key={s} to="/best/$position" params={{ position: s }} className="btn-ghost text-sm">
              Best {POSITION_PAGES[s].label.toLowerCase()}
            </Link>
          ))}
          <Link to="/best-xi-of-all-time" className="btn-ghost text-sm">
            Best XI of all time
          </Link>
          <Link to="/legends" className="btn-ghost text-sm">
            Full legends pool
          </Link>
        </div>
      </section>
    </main>
  );
}
