import { absUrl } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DraftGame } from "@/components/DraftGame";
import { DailyLeaderboard } from "@/components/DailyLeaderboard";
import { ResultCard } from "@/components/ResultCard";

import {
  dailyKey,
  dailyLabel,
  dailySeed,
  hoursUntilNext,
  loadDailyResult,
  loadDailyStats,
  saveDailyResult,
  type DailyRecord,
  type DailyStats,
} from "@/lib/daily";
import { ShareCard } from "@/components/ShareCard";
import { overall, PLAYERS, type Player } from "@/lib/players";
import type { Campaign } from "@/lib/sim";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Challenge — One Champions League Draft a Day | 17-0" },
      {
        name: "description",
        content:
          "Every player in the world gets the same eleven draft choices each day. Draft your XI, simulate the 17-match campaign, and build a streak.",
      },
      { property: "og:title", content: "17-0 Daily Challenge — Same Draft for Everyone" },
      {
        property: "og:description",
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

function DailyPage() {
  const [key, setKey] = useState<string | null>(null);
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [hours, setHours] = useState(0);

  // Date-dependent state is client-only so SSR and hydration match.
  useEffect(() => {
    const k = dailyKey();
    setKey(k);
    setRecord(loadDailyResult(k));
    setStats(loadDailyStats());
    setHours(hoursUntilNext());
  }, []);

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
    },
    [key],
  );

  if (!key) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
        <h1 className="text-4xl">Daily Challenge</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{DAILY_INTRO}</p>
        <p className="mt-3 text-muted-foreground">Loading today's draft…</p>
      </main>
    );
  }

  const label = `Daily Challenge · ${dailyLabel(key)}`;
  const alreadyPlayed = record !== null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      {alreadyPlayed ? (
        <PlayedToday record={record} stats={stats} hours={hours} label={label} dayKey={key} />
      ) : (
        <DraftGame
          mode="classic"
          fixedSeed={dailySeed(key)}
          contextLabel={label}
          kicker={label}
          allowReplay={false}
          onComplete={onComplete}
          sidebar={
            <>
              <StatsPanel stats={stats} hours={hours} />
              <DailyLeaderboard dayKey={key} record={null} />
            </>
          }
        />
      )}
    </main>
  );
}

function StatsPanel({ stats, hours }: { stats: DailyStats | null; hours: number }) {
  return (
    <aside className="surface h-fit rounded-2xl p-5">
      <p className="text-xs tracking-[0.35em] text-primary uppercase">Your streak</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        {[
          ["Streak", stats?.streak ?? 0],
          ["Best", stats?.bestStreak ?? 0],
          ["Played", stats?.played ?? 0],
          ["Titles", stats?.titles ?? 0],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-lg border border-border py-3">
            <p className="text-[0.6rem] tracking-widest text-muted-foreground uppercase">{k}</p>
            <p className="font-display text-2xl">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Everyone gets the same eleven choices today. Next draft in {hours}h.
      </p>
    </aside>
  );
}

function PlayedToday({
  record,
  stats,
  hours,
  label,
  dayKey,
}: {
  record: DailyRecord;
  stats: DailyStats | null;
  hours: number;
  label: string;
  dayKey: string;
}) {
  // Rebuild a display-only campaign shell from the stored summary.
  const picks = record.names
    .map((n) => PLAYERS.find((p) => p.name === n))
    .filter((p): p is Player => Boolean(p));

  return (
    <div>
      <header className="border-b border-border pb-6 text-center">
        <p className="text-xs tracking-[0.4em] text-primary uppercase">{label}</p>
        <h1 className="mt-3 text-4xl">You've played today</h1>
        <p className="mt-2 text-muted-foreground">
          {record.perfect
            ? "A perfect 17-0. Nothing left to prove until tomorrow."
            : record.champion
              ? "Champions of Europe — but not unbeaten."
              : `Out in the ${record.eliminatedIn}.`}{" "}
          The next daily draft unlocks in {hours}h.
        </p>
        <p className="mt-4 font-display text-5xl text-gradient">
          {record.won}-{record.lost}
        </p>
        <p className="mt-2 text-sm tracking-[0.3em] text-muted-foreground uppercase">
          {record.won} won · {record.drawn} drawn · {record.lost} lost
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {record.campaign && picks.length === 11 && (
            <ResultCard
              picks={picks}
              campaign={record.campaign}
              rating={record.rating ?? 0}
              contextLabel={label}
            />
          )}
          <div className="surface rounded-2xl p-6">
            <div className="flex flex-wrap gap-3">
              <Link to="/draft" search={{ mode: "classic" }} className="btn-primary hover:btn-primary-hover">
                Play unlimited drafts
              </Link>
              <Link to="/" className="btn-ghost">
                Home
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Come back after 00:00 UTC for a new shared draft.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          {record.campaign && picks.length === 11 && (
            <ShareCard
              picks={picks}
              campaign={record.campaign}
              rating={record.rating ?? 0}
              contextLabel={label}
            />
          )}
          <DailyLeaderboard dayKey={dayKey} record={record} />
          <StatsPanel stats={stats} hours={hours} />

        </div>
      </div>
    </div>
  );
}
