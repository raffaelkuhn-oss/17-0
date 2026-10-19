/**
 * Pure helpers for the creator-test report (scripts/creator-dashboard.ts).
 * Input: aggregate rows from the Analytics Engine SQL API, never anything per-user.
 */
export type ReportRow = { ref: string; event: string; bucket: string; n: number | string };

export type RefSummary = {
  ref: string;
  firstVisits: number; // visit in bucket d0 = new browsers
  drafts: number;
  runs: number; // sim_complete
  shares: number;
  returnD7: number;
  shareRate: number | null; // shares / runs
  returnRate: number | null; // returnD7 / firstVisits (same window; see docs for cohort caveat)
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function summarize(rows: ReportRow[]): RefSummary[] {
  const by = new Map<string, RefSummary>();
  for (const r of rows) {
    const n = Number(r.n) || 0;
    const s = by.get(r.ref) ?? {
      ref: r.ref,
      firstVisits: 0,
      drafts: 0,
      runs: 0,
      shares: 0,
      returnD7: 0,
      shareRate: null,
      returnRate: null,
    };
    if (r.event === "visit" && r.bucket === "d0") s.firstVisits += n;
    else if (r.event === "draft_start") s.drafts += n;
    else if (r.event === "sim_complete") s.runs += n;
    else if (r.event === "share_click") s.shares += n;
    else if (r.event === "return_d7") s.returnD7 += n;
    by.set(r.ref, s);
  }
  const out = [...by.values()].map((s) => ({
    ...s,
    shareRate: ratio(s.shares, s.runs),
    returnRate: ratio(s.returnD7, s.firstVisits),
  }));
  return out.sort((a, b) =>
    a.ref === "none" ? 1 : b.ref === "none" ? -1 : a.ref.localeCompare(b.ref),
  );
}

const pct = (v: number | null) => (v === null ? "-" : (v * 100).toFixed(1) + "%");

export function formatTable(rows: RefSummary[]): string {
  const head = [
    "ref",
    "first visits",
    "drafts",
    "runs",
    "shares",
    "share rate",
    "d7+ returns",
    "d7 rate",
  ];
  const body = rows.map((r) =>
    [
      r.ref,
      r.firstVisits,
      r.drafts,
      r.runs,
      r.shares,
      pct(r.shareRate),
      r.returnD7,
      pct(r.returnRate),
    ].map(String),
  );
  const w = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i]!.length)));
  const line = (c: string[]) =>
    c.map((x, i) => (i === 0 ? x.padEnd(w[i]!) : x.padStart(w[i]!))).join("  ");
  return [line(head), w.map((n) => "-".repeat(n)).join("  "), ...body.map(line)].join("\n");
}

/** Traffic classes (blob6) left out of the public report: our own checks and self-declared bots. */
export const EXCLUDED_TRAFFIC = ["internal", "bot"] as const;
const excludedList = EXCLUDED_TRAFFIC.map((t) => `'${t}'`).join(",");

/** SQL for the per-ref report. days is clamped to 1..90 (Analytics Engine retention). Internal test traffic and bots (blob6) are excluded. */
export function reportSql(days: number): string {
  const d = Math.min(90, Math.max(1, Math.floor(days) || 30));
  return `SELECT blob5 AS ref, blob1 AS event, blob2 AS bucket, SUM(_sample_interval) AS n
FROM ucl170_retention
WHERE timestamp > NOW() - INTERVAL '${d}' DAY
  AND blob1 IN ('visit','draft_start','sim_complete','share_click','return_d7')
  AND blob6 NOT IN (${excludedList})
GROUP BY ref, event, bucket`;
}

/** Same window and events, counting only the excluded rows (shown as a footnote in the dashboard). */
export function excludedSql(days: number): string {
  const d = Math.min(90, Math.max(1, Math.floor(days) || 30));
  return `SELECT blob6 AS traffic, SUM(_sample_interval) AS n
FROM ucl170_retention
WHERE timestamp > NOW() - INTERVAL '${d}' DAY
  AND blob1 IN ('visit','draft_start','sim_complete','share_click','return_d7')
  AND blob6 IN (${excludedList})
GROUP BY traffic`;
}
