import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdBanner } from "@/components/AdBanner";
import { Celebration } from "@/components/Celebration";
import { ShareCard } from "@/components/ShareCard";
import { FORMATION, PLAYERS, overall, type Player } from "@/lib/players";
import { recordLabel } from "@/lib/record";
import { trackEvent } from "@/lib/retention";
import { PLAYOFF_CUTOFF, simulate, teamRatings, type Campaign } from "@/lib/sim";
import { encodeChallenge, replayChallenge, slotCandidates, type Challenge } from "@/lib/challenge";

export type Mode = "classic" | "legend";

export type DraftGameProps = {
  mode: Mode;
  /** Fixed seed (daily challenge). When absent, each run is randomised. */
  fixedSeed?: number | undefined;
  /** Extra label shown on the result and share card, e.g. "Daily Challenge · 11 Aug". */
  contextLabel?: string | undefined;
  kicker?: string | undefined;
  /** Extra panel rendered above the squad panel (streaks, countdown…). */
  sidebar?: React.ReactNode | undefined;
  onComplete?: ((campaign: Campaign, picks: Player[]) => void) | undefined;
  /** Short blurb rendered under the header (e.g. daily rules). */
  intro?: React.ReactNode | undefined;
  /** Hides "draft again" for one-shot modes. */
  allowReplay?: boolean | undefined;
  /** Flagged live-players feature only: extra current players mixed into the legends pool. */
  extraPool?: Player[] | undefined;
  /** A friend's challenge link: same seed (pool + season), legends-only pool, never the Daily. */
  challenge?: Challenge | undefined;
};

export function DraftGame({
  mode,
  fixedSeed,
  contextLabel,
  kicker,
  sidebar,
  onComplete,
  intro,
  allowReplay = true,
  extraPool,
  challenge,
}: DraftGameProps) {
  const isDaily = fixedSeed !== undefined && !challenge;
  const theirs = useMemo(() => (challenge ? replayChallenge(challenge) : null), [challenge]);
  // Without extraPool this is the exact legends array, so seeds/candidates are unchanged.
  const pool = useMemo(() => (!challenge && extraPool?.length ? [...PLAYERS, ...extraPool] : PLAYERS), [extraPool, challenge]);
  // Fixed initial seed so SSR and hydration render identical candidate orders.
  const [seed, setSeed] = useState(challenge?.seed ?? fixedSeed ?? 12345);
  const [picks, setPicks] = useState<Player[]>([]);
  const [pickIdx, setPickIdx] = useState<number[]>([]);
  const [results, setResults] = useState<Campaign | null>(null);
  const [inChallenge, setInChallenge] = useState(!!challenge);

  useEffect(() => {
    if (fixedSeed === undefined && !challenge) setSeed(Math.floor(Math.random() * 1e9));
  }, [fixedSeed, challenge]);

  const step = picks.length;
  const slot = FORMATION[step];

  const candidates = useMemo(() => {
    if (!slot) return [];
    return slotCandidates(seed, step, picks, pool);
  }, [slot, picks, seed, step, pool]);

  function reset() {
    setPicks([]);
    setPickIdx([]);
    setResults(null);
    setInChallenge(false);
    if (fixedSeed === undefined) setSeed(Math.floor(Math.random() * 1e9));
  }

  function run() {
    const campaign = simulate(picks, seed);
    setResults(campaign);
    trackEvent("sim_complete", isDaily ? "daily" : mode);
    if (isDaily) trackEvent("daily_complete", "daily");
    // Challenge runs never report to the Daily / leaderboard handlers.
    if (!inChallenge) onComplete?.(campaign, picks);
  }

  if (results) {
    return (
      <Results
        picks={picks}
        campaign={results}
        onReset={allowReplay ? reset : undefined}
        contextLabel={contextLabel}
        challengeCode={
          // Only plain legends-pool drafts can be shared (not the Daily, not the live preview).
          !isDaily && fixedSeed === undefined && pool === PLAYERS ? encodeChallenge({ mode, seed, picks: pickIdx }) : undefined
        }
        theirs={inChallenge ? theirs?.campaign : undefined}
      />
    );
  }

  return (
    <>
      <Header
        kicker={kicker ?? (mode === "legend" ? "Legend IQ draft" : "Classic draft")}
        title={slot ? `Pick ${step + 1} of 11` : "Squad complete"}
        subtitle={slot ? slot.label : "Eleven legends locked in"}
      />

      {intro}

      {inChallenge && theirs && (
        <p className="surface mt-6 rounded-2xl p-4 text-sm" data-testid="challenge-banner">
          A friend's challenge: same pool, same 17 matches. They went{" "}
          <strong data-testid="challenge-theirs">{recordLabel(theirs.campaign)}</strong>. Can you do better?
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {slot ? (
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
              {candidates.map((p, i) => (
                <button
                  // Keyed by slot, not player: when a pick swaps the candidates, cards update in place
                  // instead of being re-ordered (which the browser reports as layout shift).
                  key={i}
                  onClick={() => {
                    if (step === 0) trackEvent("draft_start", isDaily ? "daily" : mode);
                    setPicks((prev) => [...prev, p]);
                    setPickIdx((prev) => [...prev, i]);
                  }}
                  aria-label={pickLabel(p, mode)}
                  className={`surface rounded-2xl p-5 text-left transition-transform hover:-translate-y-1 hover:border-primary ${CARD_MIN_H}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="line-clamp-2 text-2xl leading-tight">{p.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {p.club} · {p.era}
                      </p>
                      {p.live && <LiveBadge form={p.live.form} showForm={mode === "classic"} />}
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs tracking-widest uppercase">
                      {p.roles.join(" / ")}
                    </span>
                  </div>

                  {mode === "classic" ? (
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      {[
                        ["ATT", p.att],
                        ["DEF", p.def],
                        ["TEC", p.tec],
                        ["MEN", p.men],
                      ].map(([k, v]) => (
                        <div key={k as string} className="rounded-lg bg-secondary py-2">
                          <p className="text-[0.6rem] tracking-widest text-muted-foreground">{k}</p>
                          <p className="font-display text-lg">{v}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-lg bg-secondary px-3 py-3 text-center text-xs tracking-[0.3em] text-muted-foreground uppercase">
                      Stats hidden
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className={`surface flex flex-col items-center justify-center rounded-2xl p-8 text-center ${READY_MIN_H}`}>
              <h3 className="text-3xl">Ready for Europe</h3>
              <p className="mt-2 text-muted-foreground">
                Seventeen matches between you and an unbeaten campaign.
              </p>
              <button onClick={run} className="btn-primary hover:btn-primary-hover mt-6">
                Simulate the campaign
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {sidebar}
          <SquadPanel picks={picks} mode={mode} />
          <AdBanner />
        </div>
      </div>
    </>
  );
}

/**
 * Layout stability (CLS): the candidate grid and the "Ready for Europe" panel that replaces it
 * reserve the same minimum height, so the sidebar / squad panel below them on mobile does not
 * jump as picks change. 4 stacked cards on phones, 2 rows of 2 from the sm breakpoint.
 */
function LiveBadge({ form, showForm }: { form: number; showForm: boolean }) {
  return (
    <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] tracking-widest text-primary uppercase" data-testid="live-badge">
      Live
      {showForm && (
        <span>{form > 0 ? `▲ +${form}` : form < 0 ? `▼ ${form}` : "form 0"}</span>
      )}
    </p>
  );
}

const CARD_MIN_H = "min-h-[13rem]";
const READY_MIN_H = "min-h-[55rem] sm:min-h-[27rem]";

function pickLabel(p: Player, mode: Mode) {
  const position = p.roles.join("/");
  // Legend IQ hides ratings on screen, so the accessible name must not leak them either.
  return mode === "classic"
    ? `Pick ${p.name}, ${position}, rating ${overall(p)}`
    : `Pick ${p.name}, ${position}`;
}

function Header({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        <p className="text-xs tracking-[0.4em] text-primary uppercase">{kicker}</p>
        <h1 className="mt-2 text-4xl">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <Link to="/" className="btn-ghost text-sm">
        Exit
      </Link>
    </header>
  );
}

function SquadPanel({ picks, mode }: { picks: Player[]; mode: Mode }) {
  const r = teamRatings(picks);
  return (
    <aside className="surface h-fit rounded-2xl p-5">
      <h2 className="text-xl">Your XI</h2>
      <ol className="mt-4 space-y-1.5">
        {FORMATION.map((slot, i) => {
          const p = picks[i];
          return (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{slot.label}</span>
              <span className={p ? "font-semibold" : "text-muted-foreground/50"}>
                {p ? p.name : "—"}
              </span>
            </li>
          );
        })}
      </ol>
      {mode === "classic" && (
        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          {[
            ["ATK", r.attack],
            ["MID", r.midfield],
            ["DEF", r.defence],
            ["MEN", r.mentality],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-lg border border-border py-2">
              <p className="text-[0.6rem] tracking-widest text-muted-foreground">{k}</p>
              <p className="font-display text-lg">{picks.length > 0 ? v : "–"}</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

export function Results({
  picks,
  campaign,
  onReset,
  contextLabel,
  challengeCode,
  theirs,
}: {
  picks: Player[];
  campaign: Campaign;
  onReset?: (() => void) | undefined;
  contextLabel?: string | undefined;
  challengeCode?: string | undefined;
  theirs?: Campaign | undefined;
}) {
  const [copied, setCopied] = useState(false);
  async function shareChallenge() {
    if (!challengeCode) return;
    const url = `${window.location.origin}/draft?c=${challengeCode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }
    trackEvent("share_click");
    setCopied(true);
  }
  const { results, won: w, drawn: d, lost: l, points, eliminatedIn, champion, perfect } = campaign;
  const r = teamRatings(picks);

  const verdict = perfect
    ? "17-0. Seventeen matches, seventeen wins, the trophy and immortality."
    : champion
      ? "Champions of Europe — but the unbeaten run got away."
      : eliminatedIn === "League Phase"
        ? `Out in the league phase — ${points} points, short of the ${PLAYOFF_CUTOFF} needed for the top 24.`
        : eliminatedIn === "Final"
          ? "Beaten in the final. The cruellest night in football."
          : `Knocked out in the ${eliminatedIn}.`;

  return (
    <>
      {champion && <Celebration perfect={perfect} />}
      <div className="text-center">
        <p className="text-xs tracking-[0.45em] text-primary uppercase">
          {contextLabel ?? (champion ? "Champions of Europe" : "Campaign over")}
        </p>
        <h1 className={`mt-4 text-5xl sm:text-6xl ${champion ? "animate-scale-in" : ""}`}>
          <span className="text-gradient">
            {recordLabel(campaign)}
          </span>
        </h1>
        <p className="mt-2 text-sm tracking-[0.3em] text-muted-foreground uppercase">
          {w} won · {d} drawn · {l} lost · {points} league pts
        </p>

        <p className="mt-3 text-lg text-muted-foreground">{verdict}</p>
        {champion && (
          <p className="animate-fade-in mt-4 font-display text-3xl text-primary">
            {perfect ? "PERFECT CAMPAIGN 🏆" : "EUROPEAN CHAMPIONS 🏆"}
          </p>
        )}
        {theirs && (
          <p className="mt-3 text-sm text-muted-foreground" data-testid="challenge-compare">
            Your friend went {recordLabel(theirs)} with the same pool.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {challengeCode && (
            <button
              onClick={shareChallenge}
              className="btn-ghost"
              data-testid="challenge-button"
              data-challenge={challengeCode}
            >
              Challenge a friend
            </button>
          )}
          {onReset && (
            <button onClick={onReset} className="btn-primary hover:btn-primary-hover">
              Draft again
            </button>
          )}
          <Link to="/" className="btn-ghost">
            Home
          </Link>
        </div>
        {copied && (
          <p role="status" className="mt-3 text-sm text-primary">
            Link copied. Your friend gets the same pool of legends.
          </p>
        )}
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_300px]">
        <ol className="space-y-2">
          {results.map((m, i) => (
            <li
              key={i}
              className="surface flex items-center justify-between gap-4 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-[0.65rem] tracking-[0.25em] text-muted-foreground uppercase">
                  {m.round}
                </p>
                <p className="text-lg">
                  {m.opponent}
                  {m.note ? (
                    <span className="ml-2 text-xs text-muted-foreground">({m.note})</span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl">
                  {m.gf}–{m.ga}
                </span>
                <span
                  className="grid size-8 place-items-center rounded-full font-display text-sm"
                  style={{
                    backgroundColor:
                      m.outcome === "W"
                        ? "var(--color-pitch)"
                        : m.outcome === "D"
                          ? "var(--color-secondary)"
                          : "var(--color-destructive)",
                    color:
                      m.outcome === "D"
                        ? "var(--color-foreground)"
                        : "var(--color-primary-foreground)",
                    border: m.outcome === "D" ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  {m.outcome}
                </span>
              </div>
            </li>
          ))}
        </ol>

        <div className="space-y-6">
          <ShareCard
            picks={picks}
            campaign={campaign}
            rating={r.rating}
            contextLabel={contextLabel}
          />
          <aside className="surface h-fit rounded-2xl p-5">
            <h2 className="text-xl">Final XI</h2>
            <ol className="mt-4 space-y-1.5 text-sm">
              {picks.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span>{p.name}</span>
                  <span className="font-display text-muted-foreground">{overall(p)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
              Squad rating <span className="font-display text-2xl text-foreground">{r.rating}</span>
            </p>
            <Link
              to="/how-the-chances-work"
              className="mt-3 inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
            >
              How the chances work
            </Link>
          </aside>
          <AdBanner />
        </div>
      </div>
    </>
  );
}
