import { useEffect, useState } from "react";
import {
  compactBestLine,
  fullBestHeadline,
  loadPersonalBest,
  strategyBenchmarkLine,
  xiChanceLine,
  type PersonalBestRecord,
} from "@/lib/personal-best";

/**
 * Compact single-line "Your best / Saved XI" bar for return visits.
 *
 * Uses a fixed 24px (`h-6`) height and an absolute disclosure panel so that:
 * 1) On the home hero (`/`), placed below the CTAs with `mt-2 -mb-8` inside `pb-16`, every hero CTA
 *    and below-hero section stays at exact `deltaY === 0px`.
 * 2) On the draft start screen (`/draft`), placed in the 32px gap above the candidate grid with
 *    `mt-2 -mb-8`, the candidate cards and "Simulate the campaign" CTA stay at `deltaY === 0px`.
 * 3) Expanding "Saved XI" opens a floating card (`absolute top-full z-20`) without shifting layout.
 */
export function PersonalBestBar({
  best,
  align = "left",
  className,
}: {
  best: PersonalBestRecord | null;
  align?: "left" | "center";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!best) return null;

  return (
    <div
      className={`relative h-6 ${align === "center" ? "mx-auto max-w-md text-center" : "text-left"} ${className ?? ""}`}
      data-testid="personal-best"
    >
      <p className="inline-flex max-w-full items-center gap-1.5 truncate text-[0.7rem] leading-6 text-muted-foreground sm:text-xs">
        <span className="truncate" data-testid="personal-best-summary">
          {compactBestLine(best)}
        </span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          data-testid="personal-best-toggle"
          className="shrink-0 font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {open ? "Hide XI" : "Saved XI"}
        </button>
      </p>

      {open && (
        <div
          role="region"
          aria-label="Saved personal-best XI"
          data-testid="personal-best-xi"
          className="surface absolute top-full right-0 left-0 z-20 mt-1.5 max-w-md rounded-2xl border border-border p-4 text-left shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] tracking-[0.25em] text-primary uppercase">
                Personal best · saved on this device
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground" data-testid="personal-best-headline">
                {fullBestHeadline(best)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
              aria-label="Close saved XI"
            >
              Close
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground" data-testid="personal-best-xi-chance">
            {xiChanceLine(best)}
          </p>
          <p className="mt-1 text-[0.7rem] text-muted-foreground" data-testid="personal-best-benchmark">
            {strategyBenchmarkLine(best)}
          </p>
          <ol className="mt-3 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2" data-testid="personal-best-xi-list">
            {best.xi.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-md bg-secondary/70 px-2.5 py-1"
              >
                <span className="truncate">
                  <span className="text-muted-foreground">{p.role}</span>{" "}
                  <span className="font-medium text-foreground">{p.name}</span>
                </span>
                <span className="font-display text-muted-foreground tabular-nums">{p.rating}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** Client-hydrated wrapper for the home start screen (`/`). */
export function HomePersonalBest() {
  const [best, setBest] = useState<PersonalBestRecord | null>(null);
  useEffect(() => {
    setBest(loadPersonalBest());
  }, []);
  return <PersonalBestBar best={best} align="center" className="mt-2 -mb-8" />;
}
