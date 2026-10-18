import { createFileRoute, Link } from "@tanstack/react-router";
import { absUrl } from "@/lib/site";
import { overall } from "@/lib/players";
import { pointsLine, recordHeadline, recordWDL, recordWords } from "@/lib/record";
import { exitPhrase } from "@/lib/share-text";
import { isExpiredRunCode, runFromCode, runOgPath, runOgTitle, runStamp, runTitle } from "@/lib/og/run-page";
import { ExpiredChallenge, EXPIRED_CHALLENGE_COPY, EXPIRED_CHALLENGE_TITLE } from "@/components/ExpiredChallenge";

/**
 * /r/<code>: a shared run, rebuilt from the challenge code alone (nothing stored server-side).
 * noindex: one thin page per run would flood search results; the link exists for previews and play.
 */
export const Route = createFileRoute("/r/$code")({
  loader: ({ params }) => {
    const run = runFromCode(params.code);
    return run
      ? { ok: true as const, title: runTitle(run.campaign), ogTitle: runOgTitle(run.campaign, runStamp(run)), record: recordWDL(run.campaign), headline: recordHeadline(run.campaign), perfect: run.campaign.perfect, exit: exitPhrase(run.campaign) }
      : { ok: false as const, expired: isExpiredRunCode(params.code) };
  },
  head: ({ loaderData, params }) => {
    const robots = { name: "robots", content: "noindex, follow" };
    if (!loaderData?.ok) {
      // Retired v1 run: 200 with the expired note; og/twitter image stay the site default (from __root).
      if (loaderData?.expired) {
        return { meta: [{ title: EXPIRED_CHALLENGE_TITLE }, { name: "description", content: EXPIRED_CHALLENGE_COPY }, robots, { property: "og:title", content: "17-0 Draft: draft your own XI" }, { property: "og:description", content: EXPIRED_CHALLENGE_COPY }] };
      }
      return { meta: [{ title: "Run not found — 17-0 Draft" }, robots] };
    }
    // og:title per copy-stamp.md §4; a perfect run keeps the brand label "17-0" (copy-final.md #3).
    const title = loaderData.ogTitle;
    const desc = `An all-time Champions League XI went ${loaderData.record} (${loaderData.exit}). Draft your own and see if you can go 17-0.`;
    const img = absUrl(runOgPath(params.code));
    const alt = `17-0 Draft run: ${loaderData.title}, with the XI and every match result`;
    return {
      meta: [
        { title: `${loaderData.title} — 17-0 Draft` },
        { name: "description", content: desc },
        robots,
        { property: "og:title", content: title },
        { name: "twitter:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:description", content: desc },
        { property: "og:url", content: absUrl(`/r/${params.code}`) },
        { property: "og:image", content: img },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: alt },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: img },
        { name: "twitter:image:alt", content: alt },
      ],
    };
  },
  component: RunPage,
});

function RunPage() {
  const { code } = Route.useParams();
  const run = runFromCode(code);

  if (!run && isExpiredRunCode(code)) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-6 py-10" data-testid="run-expired">
        <ExpiredChallenge />
      </main>
    );
  }

  if (!run) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-6 py-16 text-center" data-testid="run-invalid">
        <p className="text-xs tracking-[0.4em] text-primary uppercase">Shared run</p>
        <h1 className="mt-4 text-4xl">This run link didn't work</h1>
        <p className="mt-3 text-muted-foreground">
          It may be cut off or from an old version of the game. You can still draft your own XI.
        </p>
        <Link to="/draft" className="btn-primary hover:btn-primary-hover mt-8 inline-flex px-8">
          Build your own XI
        </Link>
      </main>
    );
  }

  const { campaign: c, picks } = run;
  const stamp = runStamp(run);
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10" data-testid="run-page">
      <div className="text-center">
        <p className="text-xs tracking-[0.45em] text-primary uppercase">Shared run</p>
        <h1 className="mt-4 text-5xl sm:text-6xl">
          <span className="text-gradient">{recordHeadline(c)}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="record-words">
          {recordWords(c)}
        </p>
        {pointsLine(c) && (
          <p className="text-sm text-muted-foreground" data-testid="record-points">
            {pointsLine(c)}
          </p>
        )}
        <p className="mt-3 text-lg text-muted-foreground">
          {c.perfect ? "Seventeen matches, seventeen wins. Can you match it?" : `This XI went ${recordWDL(c)}, ${exitPhrase(c)}. Think you can go 17-0?`}
        </p>
        <p className="mt-3 font-semibold" data-testid="run-stamp">
          Their XI goes 17-0 about 1 in {stamp.n}. Can yours beat it?
        </p>
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
          <Link to="/draft" className="btn-primary hover:btn-primary-hover w-full" data-testid="run-build">
            Build your own XI
          </Link>
          <Link to="/draft" search={{ c: code }} className="btn-ghost w-full" data-testid="run-challenge" title="Same pool of legends as this run">
            Play this challenge
          </Link>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_300px]">
        <ol className="space-y-2" aria-label="Match results">
          {c.results.map((m, i) => (
            <li key={i} className="surface flex items-center justify-between gap-4 rounded-xl px-4 py-3">
              <div>
                <p className="text-[0.65rem] tracking-[0.25em] text-muted-foreground uppercase">{m.round}</p>
                <p className="text-lg">{m.opponent}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl">
                  {m.gf}–{m.ga}
                </span>
                <span
                  className="grid size-8 place-items-center rounded-full font-display text-sm"
                  style={{
                    backgroundColor:
                      m.outcome === "W" ? "var(--color-pitch)" : m.outcome === "D" ? "var(--color-secondary)" : "var(--color-destructive)",
                    color: m.outcome === "W" ? "var(--color-primary-foreground)" : "var(--color-foreground)",
                    border: m.outcome === "D" ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  {m.outcome}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <aside className="surface h-fit rounded-2xl p-5">
          <h2 className="text-xl">The XI</h2>
          <ol className="mt-4 space-y-1.5 text-sm">
            {picks.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span>{p.name}</span>
                <span className="font-display text-muted-foreground">{overall(p)}</span>
              </li>
            ))}
          </ol>
          <Link
            to="/how-the-chances-work"
            className="mt-4 inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
          >
            How the chances work
          </Link>
        </aside>
      </div>
    </main>
  );
}
