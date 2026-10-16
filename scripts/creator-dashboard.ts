// Creator-test dashboard: prints one row per ref code from Analytics Engine (read-only).
// Run: CF_ACCOUNT_ID=<id> CF_ANALYTICS_TOKEN=<token> bun scripts/creator-dashboard.ts [days=30]
// Token needs only "Account Analytics: Read". It is read from the env and never printed.
import { formatTable, reportSql, summarize, type ReportRow } from "../src/lib/creator-report";

const account = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_ANALYTICS_TOKEN;
if (!account || !token) {
  console.error("Set CF_ACCOUNT_ID and CF_ANALYTICS_TOKEN (Account Analytics: Read).");
  process.exit(2);
}
const days = Number(process.argv[2] ?? 30);
const sql = reportSql(days);
const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: sql,
  },
);
if (!res.ok) {
  console.error(`Analytics Engine SQL failed: HTTP ${res.status}`);
  process.exit(1);
}
const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
// Rows written before the ref field existed have no blob5 (empty string): show them as "none".
const rows: ReportRow[] = (json.data ?? []).map((r) => ({
  ref: String(r.ref || "none"),
  event: String(r.event),
  bucket: String(r.bucket),
  n: Number(r.n),
}));
console.log(
  `17-0 creator test, last ${Math.min(90, Math.max(1, Math.floor(days) || 30))} days (Analytics Engine, sampled counts)\n`,
);
console.log(formatTable(summarize(rows)));
