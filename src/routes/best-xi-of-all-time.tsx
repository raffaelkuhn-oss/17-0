import { absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FORMATION, overall, PLAYERS, ROLE_LABEL, type Player, type Role } from "@/lib/players";

const URL = absUrl("/best-xi-of-all-time");

/** Highest-rated available player for each slot, no player used twice. */
function buildBestXI(): { role: Role; label: string; player: Player }[] {
  const used = new Set<string>();
  return FORMATION.map((slot) => {
    const best = PLAYERS.filter((p) => p.roles.includes(slot.role) && !used.has(p.id)).sort(
      (a, b) => overall(b) - overall(a),
    )[0]!;
    used.add(best.id);
    return { role: slot.role, label: slot.label, player: best };
  });
}

function topByRole(role: Role, n: number) {
  return PLAYERS.filter((p) => p.roles.includes(role))
    .sort((a, b) => overall(b) - overall(a))
    .slice(0, n);
}

export const Route = createFileRoute("/best-xi-of-all-time")({
  head: () => ({
    meta: [
      { title: "Best Champions League XI of All Time — Ranked by Position" },
      {
        name: "description",
        content:
          "The highest-rated Champions League XI of all time, position by position, plus the top-rated players at every role from a pool of European legends.",
      },
      {
        property: "og:title",
        content: "Best Champions League XI of All Time — Ranked by Position",
      },
      {
        name: "twitter:title",
        content: "Best Champions League XI of All Time — Ranked by Position",
      },
      {
        property: "og:description",
        content:
          "Goalkeeper to left wing: the strongest all-time European XI, with ratings for every position.",
      },
      {
        name: "twitter:description",
        content:
          "Goalkeeper to left wing: the strongest all-time European XI, with ratings for every position.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: BestXI,
});

function BestXI() {
  const xi = buildBestXI();
  const teamRating = Math.round(xi.reduce((s, x) => s + overall(x.player), 0) / xi.length);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">All-time rankings</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">Best Champions League XI of all time</h1>
      <p className="mt-5 text-lg text-muted-foreground">
        This is the strongest possible eleven from the {PLAYERS.length}-player 17-0 legends pool:
        the highest-rated genuine specialist at each of the eleven positions, no player used out of
        role. Combined squad rating {teamRating}. Ratings blend attack, defence, technique and
        big-game mentality, weighted differently for each position.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/draft" className="btn-primary hover:btn-primary-hover">
          Draft your own XI
        </Link>
        <Link to="/ucl-simulator" className="btn-ghost">
          About the simulator
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl">The XI, position by position</h2>
        <ol className="mt-5 space-y-2">
          {xi.map(({ label, player }) => (
            <li
              key={player.id}
              className="surface flex items-center justify-between gap-4 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-[0.65rem] tracking-[0.25em] text-muted-foreground uppercase">
                  {label}
                </p>
                <p className="text-lg">{player.name}</p>
                <p className="text-sm text-muted-foreground">
                  {player.club} · {player.era}
                </p>
              </div>
              <span className="font-display text-3xl text-gradient">{overall(player)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl">Top three at every position</h2>
        <p className="mt-2 text-muted-foreground">
          Every role in the pool, ranked. Players who genuinely covered two roles appear in both.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
            <div key={role} className="surface rounded-xl p-4">
              <h3 className="text-lg">{ROLE_LABEL[role]}</h3>
              <ol className="mt-2 space-y-1 text-sm">
                {topByRole(role, 3).map((p, i) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {i + 1}. <span className="text-foreground">{p.name}</span>
                    </span>
                    <span className="font-display">{overall(p)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 border-t border-border pt-8">
        <h2 className="text-2xl">Think you can build better?</h2>
        <p className="mt-2 text-muted-foreground">
          The draft only offers four random candidates per position, so the perfect XI above is
          almost never available. That's the game.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/daily" className="btn-ghost text-sm">
            Daily challenge
          </Link>
          <Link to="/best/$position" params={{ position: "strikers" }} className="btn-ghost text-sm">
            Best strikers
          </Link>
          <Link to="/best/$position" params={{ position: "goalkeepers" }} className="btn-ghost text-sm">
            Best goalkeepers
          </Link>
          <Link to="/legends" className="btn-ghost text-sm">
            All {PLAYERS.length} legends and stats
          </Link>
        </div>
      </section>
    </main>
  );
}
