import { absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdBanner } from "@/components/AdBanner";
import {
  PLAYERS,
  ROLE_LABEL,
  overall,
  positionOf,
  type Role,
} from "@/lib/players";

export const Route = createFileRoute("/legends")({
  head: () => ({
    meta: [
      { title: "Legends Pool — Every Player and Rating | 17-0" },
      {
        name: "description",
        content:
          "Browse the full 17-0 legends pool: every Champions League great with their role, club, era and attack, defence, technique and mentality ratings.",
      },
      { property: "og:title", content: "Legends Pool — Every Player and Rating | 17-0" },
      {
        property: "og:description",
        content: "Every legend in the 17-0 draft pool with full ratings, roles, clubs and eras.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absUrl("/legends") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absUrl("/legends") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Legends Pool",
          description:
            "Every Champions League legend in the 17-0 draft pool with role, club, era and ratings.",
          url: absUrl("/legends"),
        }),
      },
    ],
  }),
  component: LegendsPage,
});

const ROLE_ORDER: Role[] = ["GK", "RB", "CB", "LB", "DM", "CM", "AM", "RW", "ST", "LW"];
type SortKey = "ovr" | "name" | "att" | "def" | "tec" | "men";

function LegendsPage() {
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("ovr");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLAYERS.filter(
      (p) =>
        (role === "ALL" || p.roles.includes(role)) &&
        (!q || p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q)),
    ).sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name)
      : sort === "ovr" ? overall(b) - overall(a)
      : b[sort] - a[sort],
    );
  }, [role, query, sort]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs tracking-[0.4em] text-primary uppercase">The databank</p>
          <h1 className="mt-2 text-4xl">Legends pool</h1>
          <p className="text-muted-foreground">
            {PLAYERS.length} players · every role, rating and era in the draft
          </p>
        </div>
        <Link to="/" className="btn-ghost text-sm">
          Home
        </Link>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player or club"
          aria-label="Search player or club"
          className="w-full max-w-xs rounded-full border border-border bg-secondary px-4 py-2 text-sm outline-none focus:border-primary sm:w-auto"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort by"
          className="rounded-full border border-border bg-secondary px-4 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="ovr">Sort: Overall</option>
          <option value="att">Sort: Attack</option>
          <option value="def">Sort: Defence</option>
          <option value="tec">Sort: Technique</option>
          <option value="men">Sort: Mentality</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["ALL", ...ROLE_ORDER] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            aria-pressed={role === r}
            className={`rounded-full border px-3 py-1.5 text-xs tracking-widest uppercase transition-colors ${
              role === r
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {r === "ALL" ? "All" : r}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {rows.length} {rows.length === 1 ? "player" : "players"}
        {role !== "ALL" && <> who can play {ROLE_LABEL[role]}</>}
      </p>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="surface overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                <th className="px-4 py-3">Player</th>
                <th className="px-2 py-3">Roles</th>
                <th className="px-2 py-3 text-center">ATT</th>
                <th className="px-2 py-3 text-center">DEF</th>
                <th className="px-2 py-3 text-center">TEC</th>
                <th className="px-2 py-3 text-center">MEN</th>
                <th className="px-4 py-3 text-center">OVR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <span className="block leading-tight">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.club} · {p.era} · {positionOf(p)}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-xs tracking-wider text-muted-foreground uppercase">
                    {p.roles.join(" / ")}
                  </td>
                  <td className="px-2 py-3 text-center font-display">{p.att}</td>
                  <td className="px-2 py-3 text-center font-display">{p.def}</td>
                  <td className="px-2 py-3 text-center font-display">{p.tec}</td>
                  <td className="px-2 py-3 text-center font-display">{p.men}</td>
                  <td className="px-4 py-3 text-center font-display text-lg text-gradient">
                    {overall(p)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="px-4 py-10 text-center text-muted-foreground">
              No legends match that search.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <AdBanner />
        </div>
      </div>
    </main>
  );
}
