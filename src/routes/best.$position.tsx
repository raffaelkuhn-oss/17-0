import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { overall, PLAYERS, ROLE_LABEL } from "@/lib/players";
import { POSITION_PAGES, POSITION_SLUGS, type PositionSlug } from "@/lib/position-pages";

const BASE = SITE_URL;

export const Route = createFileRoute("/best/$position")({
  loader: ({ params }) => {
    if (!(params.position in POSITION_PAGES)) throw notFound();
    return { slug: params.position as PositionSlug };
  },
  head: ({ params }) => {
    const page = POSITION_PAGES[params.position as PositionSlug];
    if (!page) return { meta: [{ title: "Not found — 17-0 Draft" }] };
    const url = `${BASE}/best/${params.position}`;
    const title = `Best Champions League ${page.label} of All Time (Ranked)`;
    const desc = `The greatest Champions League ${page.label.toLowerCase()} ever, ranked by attack, defence, technique and big-game mentality. Draft them in the free 17-0 UCL simulator.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { name: "twitter:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "17-0", item: BASE },
              { "@type": "ListItem", position: 2, name: `Best ${page.label}`, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: BestPosition,
});

function BestPosition() {
  const { slug } = Route.useLoaderData();
  const page = POSITION_PAGES[slug];
  const roles: readonly string[] = page.roles;
  const ranked = PLAYERS.filter((p) => p.roles.some((r) => roles.includes(r)))
    .sort((a, b) => overall(b) - overall(a))
    .slice(0, 15);
  const top = ranked[0];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">All-time rankings</p>
      <h1 className="mt-4 text-4xl sm:text-5xl">
        Best Champions League {page.label.toLowerCase()} of all time
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        {top
          ? `${top.name} (${top.club}, ${top.era}) is the highest-rated Champions League ${page.singular} in the 17-0 legends pool with an overall of ${overall(top)}. `
          : ""}
        Below are the top {ranked.length} {page.label.toLowerCase()} ranked by a position-weighted
        blend of attack, defence, technique and big-game mentality.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/draft" className="btn-primary hover:btn-primary-hover">
          Draft them in your XI
        </Link>
        <Link to="/daily" className="btn-ghost">
          Today's daily challenge
        </Link>
      </div>

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
        <h2 className="text-2xl">More all-time rankings</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {POSITION_SLUGS.filter((s) => s !== slug).map((s) => (
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
