import { SITE_HOST } from "@/lib/site";
import { FORMATION, overall, type Player } from "@/lib/players";
import type { Campaign } from "@/lib/sim";
import { recordLabel } from "@/lib/record";

function headline(campaign: Campaign) {
  if (campaign.perfect) return "PERFECT 17-0";
  if (campaign.champion) return "CHAMPIONS OF EUROPE";
  if (campaign.eliminatedIn === "League Phase") return "OUT IN THE LEAGUE PHASE";
  if (campaign.eliminatedIn === "Final") return "BEATEN IN THE FINAL";
  return `OUT IN THE ${(campaign.eliminatedIn ?? "").toUpperCase()}`;
}

export function ResultCard({
  picks,
  campaign,
  rating,
  contextLabel,
}: {
  picks: Player[];
  campaign: Campaign;
  rating: number;
  contextLabel?: string | undefined;
}) {
  const accent = campaign.perfect ? "#f5c451" : campaign.champion ? "#ebf5eb" : "#ef4470";

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="h-2 w-full" style={{ backgroundColor: accent }} />
      <div className="p-6 sm:p-8">
        <p
          className="text-xs tracking-[0.35em] uppercase"
          style={{ color: accent }}
        >
          {headline(campaign)}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <h2 className="font-display text-6xl leading-none sm:text-7xl text-gradient">
            {recordLabel(campaign)}
          </h2>
          <div className="mb-1.5">
            {contextLabel && (
              <p className="text-sm font-medium" style={{ color: accent }}>
                {contextLabel}
              </p>
            )}
            <p className="text-sm tracking-widest text-muted-foreground uppercase">
              {campaign.won}W · {campaign.drawn}D · {campaign.lost}L · {campaign.points} league pts
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-8 shrink-0 text-xs font-semibold text-muted-foreground">
                  {FORMATION[i]?.role ?? ""}
                </span>
                <span className="truncate">{p.name}</span>
              </span>
              <span className="font-display shrink-0" style={{ color: accent }}>
                {overall(p)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {campaign.results.map((m, i) => (
            <span
              key={i}
              className="grid size-6 place-items-center rounded-md text-[10px] font-bold"
              style={{
                backgroundColor:
                  m.outcome === "W"
                    ? "#ebf5eb"
                    : m.outcome === "D"
                      ? "#ffffff28"
                      : "#ef4470",
                color:
                  m.outcome === "D"
                    ? "var(--color-foreground)"
                    : "#1b3a20",
              }}
            >
              {m.outcome}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
          <p>
            Squad rating <span className="font-display text-xl text-foreground">{rating}</span>
          </p>
          <p className="font-semibold text-foreground">{SITE_HOST}</p>
        </div>
      </div>
    </div>
  );
}
