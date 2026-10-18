import { absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDailyPlayedStatus, markDailyCompleted } from "@/lib/daily-cookie.functions";
import { DraftGame } from "@/components/DraftGame";
import { DailyLeaderboard } from "@/components/DailyLeaderboard";
import { ResultCard } from "@/components/ResultCard";
import { NextDaily, StatsPanel } from "@/components/DailyStats";

import {
  currentStreak,
  dailyKey,
  dailyLabel,
  dailyNumber,
  dailySeed,
  loadDailyResult,
  loadDailyStats,
  saveDailyResult,
  type DailyRecord,
  type DailyStats,
} from "@/lib/daily";
import { ShareButton, ShareCard } from "@/components/ShareCard";
import { recordHeadline } from "@/lib/record";
import { overall, PLAYERS, type Player } from "@/lib/players";
import type { Campaign } from "@/lib/sim";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Challenge — One Champions League Draft a Day | 17-0" },
      {
        name: "description",
        content:
          "Every player in the world starts from the same seeded draft each day. Draft your XI, simulate the 17-match campaign, and build a streak.",
      },
      { property: "og:title", content: "17-0 Daily Challenge — Same Draft for Everyone" },
      { name: "twitter:title", content: "17-0 Daily Challenge — Same Draft for Everyone" },
      {
        property: "og:description",
        content:
          "One shared Champions League draft per day. Same picks for everyone, compare results, keep your streak alive.",
      },
      {
        name: "twitter:description",
        content:
          "One shared Champions League draft per day. Same picks for everyone, compare results, keep your streak alive.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absUrl("/daily") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absUrl("/daily") }],
  }),
  component: DailyPage,
});

const DAILY_INTRO =
  "The Daily Challenge gives every player in the world the same 11-slot draft each day. You get one attempt, so choose carefully, then watch your XI play out the 17-match Champions League campaign. Aim for a perfect 17-0.";

/** Short rules blurb: static text, so it is part of the server-rendered HTML. */
function DailyRules() {
  return (
    <ul
      className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground"
      aria-label="Daily rules"
    >
      {[
        "Same 11-slot draft for everyone each day",
        "One attempt",
        "Fixed seed: identical choices worldwide",
        "New draft at 00:00 UTC",
      ].map((r) => (
        <li key={r} className="rounded-full border border-border px-3 py-1.5">
          {r}
        </li>
      ))}
    </ul>
  );
}

function DailyPage() {
  const [key, setKey] = useState<string | null>(null);
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  // Signed cookie says played, even if localStorage was cleared.
  const [cookiePlayed, setCookiePlayed] = useState(false);
  const fetchStatus = useServerFn(getDailyPlayedStatus);
  const markCompleted = useServerFn(markDailyCompleted);

  // Date-dependent state is client-only so SSR and hydration match.
  useEffect(() => {
    const k = dailyKey();
    setKey(k);
    setRecord(loadDailyResult(k));
    setStats(loadDailyStats());
    fetchStatus({ data: { dayKey: k } })
      .then((r) => setCookiePlayed(r.played))
      .catch(() => {});
  }, [fetchStatus]);

  const onComplete = useCallback(
    (campaign: Campaign, picks: Player[]) => {
      if (!key) return;
      const rating = Math.round(picks.reduce((s, p) => s + overall(p), 0) / (picks.length || 1));
      const saved = saveDailyResult(
        campaign,
        picks.map((p) => p.name),
        key,
        rating,
      );
      setRecord(saved.record);
      setStats(saved.stats);
      markCompleted({ data: { dayKey: key } }).catch(() => {});
    },
    [key, markCompleted],
  );

  if (!key) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
        <h1 className="text-4xl">Daily Challenge</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{DAILY_INTRO}</p>
        <DailyRules />
        <p className="mt-4 text-muted-foreground">Loading today's draft…</p>
      </main>
    );
  }

  const label = `Daily Challenge · ${dailyLabel(key)}`;
  const alreadyPlayed = record !== null || cookiePlayed;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      {alreadyPlayed ? (
        <PlayedToday record={record} stats={stats} label={label} dayKey={key} />
      ) : (
        <DraftGame
          mode="classic"
          fixedSeed={dailySeed(key)}
          contextLabel={label}
          kicker={label}
          dailyNumber={dailyNumber(key)}
          dailyStreak={currentStreak(stats, key)}
          intro={<DailyRules />}
          allowReplay={false}
          onComplete={onComplete}
          sidebar={
            <>
              <StatsPanel stats={stats} today={key} />
              <DailyLeaderboard dayKey={key} record={null} />
            </>
          }
        />
      )}
    </main>
  );
}

function PlayedToday({
  record,
  stats,
  label,
  dayKey,
}: {
  record: DailyRecord | null;
  stats: DailyStats | null;
  label: string;
  dayKey: string;
}) {
  // Rebuild a display-only campaign shell from the stored summary.
  const picks = (record?.names ?? [])
    .map((n) => PLAYERS.find((p) => p.name === n))
    .filter((p): p is Player => Boolean(p));

  const hasCard = Boolean(record?.campaign) && picks.length === 11;

  return (
    <div>
      <header className="border-b border-border pb-6 text-center">
        <p className="text-xs tracking-[0.4em] text-primary uppercase">{label}</p>
        <h1 className="mt-3 text-4xl">You've played today</h1>
        <p className="mt-2 text-muted-foreground">
          You've played today's challenge. Come back tomorrow for a new draft.
        </p>
        {record && (
          <p className="mt-2 text-muted-foreground">
            {record.perfect
              ? "A perfect 17-0. Nothing left to prove until tomorrow."
              : record.champion
                ? "Champions of Europe — but not unbeaten."
                : `Out in the ${record.eliminatedIn}.`}
          </p>
        )}
        <NextDaily className="mt-2 text-muted-foreground" />
        {record && !hasCard && (
          // Fallback for old saved records without a full campaign: no ResultCard, so show the record here.
          <p className="mt-4 font-display text-5xl text-gradient">{recordHeadline(record)}</p>
        )}
        {record?.campaign && (
          <div className="mx-auto mt-5 max-w-sm">
            <ShareButton
              campaign={record.campaign}
              picks={picks.length === 11 ? picks : undefined}
              contextLabel={label}
              dailyNumber={dailyNumber(dayKey)}
              dailyStreak={currentStreak(stats, dayKey)}
              trackMode="daily"
            />
          </div>
        )}
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {record?.campaign && picks.length === 11 && (
            <ResultCard
              picks={picks}
              campaign={record.campaign}
              rating={record.rating ?? 0}
              contextLabel={label}
            />
          )}
          <div className="surface rounded-2xl p-6">
            <div className="flex flex-wrap gap-3">
              <Link to="/draft" className="btn-primary hover:btn-primary-hover">
                Play unlimited drafts
              </Link>
              <Link to="/" className="btn-ghost">
                Home
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              A new shared draft drops every day at 00:00 UTC.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          {record?.campaign && picks.length === 11 && (
            <ShareCard
              picks={picks}
              campaign={record.campaign}
              rating={record.rating ?? 0}
              contextLabel={label}
              dailyNumber={dailyNumber(dayKey)}
              dailyStreak={currentStreak(stats, dayKey)}
              trackMode="daily"
            />
          )}
          <StatsPanel stats={stats} today={dayKey} record={record} />
          <DailyLeaderboard dayKey={dayKey} record={record} />
        </div>
      </div>
    </div>
  );
}
