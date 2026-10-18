/**
 * Wordle-style Daily stats (Mkt #4). Everything comes from localStorage via src/lib/daily.ts;
 * nothing is sent to the server and no analytics events are added.
 */
import { useEffect, useState } from "react";
import {
  OUTCOMES,
  OUTCOME_LABEL,
  countdownLabel,
  currentStreak,
  dailyNumber,
  localResetTime,
  nextDailyAt,
  outcomeOf,
  type DailyRecord,
  type DailyStats,
} from "@/lib/daily";
import { recordWDL } from "@/lib/record";

/** "Next Daily at 02:00 your time · in 9h 58m". The reset is 00:00 UTC; this shows it on the visitor's clock. */
export function NextDaily({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!now) return null; // client-only: the visitor's time zone is unknown during SSR
  const left = nextDailyAt(now).getTime() - now.getTime();
  return (
    <p className={className ?? "text-sm text-muted-foreground"} data-testid="next-daily">
      <span className="whitespace-nowrap">Next Daily at {localResetTime(now)} your time</span>{" "}
      <span className="whitespace-nowrap">
        (in <span className="tabular-nums">{countdownLabel(left)}</span>)
      </span>
    </p>
  );
}

export function StatsPanel({ stats, today, record }: { stats: DailyStats | null; today: string; record?: DailyRecord | null }) {
  const streak = currentStreak(stats, today);
  const dist = stats?.dist;
  const max = Math.max(1, ...OUTCOMES.map((o) => dist?.[o] ?? 0));
  const mine = record ? outcomeOf(record) : null;
  const recent = (stats?.history ?? []).slice(-7).reverse();
  return (
    <aside className="surface h-fit rounded-2xl p-5" data-testid="daily-stats">
      <p className="text-xs tracking-[0.35em] text-primary uppercase">Your Daily stats</p>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {(
          [
            ["Played", stats?.played ?? 0],
            ["Streak", streak],
            ["Best", stats?.bestStreak ?? 0],
            ["Titles", stats?.titles ?? 0],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border py-3">
            <p className="font-display text-2xl tabular-nums">{v}</p>
            <p className="text-[0.6rem] tracking-widest text-muted-foreground uppercase">{k}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[0.65rem] tracking-[0.3em] text-muted-foreground uppercase">How far you got</p>
      <ol className="mt-2 space-y-1" aria-label="How far your Daily runs got">
        {OUTCOMES.map((o) => {
          const n = dist?.[o] ?? 0;
          return (
            <li key={o} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">{OUTCOME_LABEL[o]}</span>
              <span className="flex-1">
                <span
                  className={`block h-5 min-w-6 rounded px-1.5 text-right leading-5 tabular-nums ${o === mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                  style={{ width: `${Math.max(8, (n / max) * 100)}%` }}
                >
                  {n}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {recent.length > 0 && (
        <>
          <p className="mt-5 text-[0.65rem] tracking-[0.3em] text-muted-foreground uppercase">Recent Dailies</p>
          <ul className="mt-2 space-y-1 text-xs" aria-label="Recent Daily results">
            {recent.map((h) => (
              <li key={h.key} className="flex justify-between gap-2">
                <span className="text-muted-foreground">#{dailyNumber(h.key)}</span>
                <span className="tabular-nums">{recordWDL(h)}</span>
                <span className="w-24 text-right text-muted-foreground">{OUTCOME_LABEL[h.o]}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 text-xs text-muted-foreground">Everyone starts from the same first four choices today.</p>
      <NextDaily className="mt-1 text-xs text-muted-foreground" />
      <p className="mt-3 text-[0.65rem] text-muted-foreground">Stats stay in this browser only.</p>
    </aside>
  );
}
