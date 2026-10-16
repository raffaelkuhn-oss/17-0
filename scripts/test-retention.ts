// Run: bun scripts/test-retention.ts
import { bucketFor, eventBody, nextVisit, parseRef, sourceBucket } from "../src/lib/retention";
import { formatTable, reportSql, summarize } from "../src/lib/creator-report";
import { handleRetentionEvent } from "../src/lib/retention-server";
import { INTERNAL_UA_TOKEN, trafficFor } from "../src/lib/traffic";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const d = (s: string) => new Date(s + "T12:00:00Z");

t("utm x", sourceBucket("Twitter", null) === "x");
t("utm unknown -> other (no free text)", sourceBucket("john.doe@example.com", null) === "other");
t("referrer reddit", sourceBucket(null, "https://old.reddit.com/r/soccer/") === "reddit");
t("referrer hn", sourceBucket(null, "https://news.ycombinator.com/item?id=1") === "hn");
t("referrer google.co.uk", sourceBucket(null, "https://www.google.co.uk/") === "google");
t("same-site referrer -> direct", sourceBucket(null, "https://ucl17-0.com/draft", "ucl17-0.com") === "direct");
t("no referrer -> direct", sourceBucket(null, "") === "direct");
t("buckets", ["d0","d1","d2-6","d2-6","d7","d8+"].join() === [0,1,2,6,7,30].map(bucketFor).join());

const a = nextVisit(null, d("2026-10-01"), "reddit");
t("first visit: visit d0", a.events.join() === "visit" && a.bucket === "d0" && a.state.source === "reddit");
const a2 = nextVisit(a.state, d("2026-10-01"), "x");
t("same day: no events, source kept", a2.events.length === 0 && a2.state.source === "reddit");
const b = nextVisit(a.state, d("2026-10-02"), "x");
t("day 1: visit + return_d1", b.events.join() === "visit,return_d1" && b.bucket === "d1");
const c = nextVisit(b.state, d("2026-10-08"), "x");
t("day 7: visit + return_d7", c.events.join() === "visit,return_d7" && c.bucket === "d7");
t("state: only known fields, no ID", Object.keys(c.state).sort().join() === "d7,firstSeen,lastSeen,source");
const c2 = nextVisit(c.state, d("2026-10-09"), "x");
t("day 8 after d7 fired: no second return_d7", c2.events.join() === "visit");

// ---- creator ref ----
t("parseRef c01..c10", parseRef("c01") === "c01" && parseRef(" C10 ") === "c10");
t("parseRef rejects others", [null, "", "c00", "c11", "c1", "c001", "john", "c01x", "c01&x=1"].every((v) => parseRef(v) === null));
const r0 = nextVisit(null, d("2026-10-01"), "other", parseRef("c03"));
t("first visit stores ref", r0.state.ref === "c03");
const rBad = nextVisit(null, d("2026-10-01"), "other", parseRef("evil"));
t("invalid ref not stored", !("ref" in rBad.state));
const r1v = nextVisit(r0.state, d("2026-10-02"), "x", parseRef("c05"));
t("later visit never overwrites ref", r1v.state.ref === "c03");
const old = nextVisit({ firstSeen: "2026-10-01", lastSeen: "2026-10-01", source: "direct" }, d("2026-10-02"), "x", parseRef("c02"));
t("existing visitor (no ref) does not pick one up later", !("ref" in old.state));

// ---- return_d7 = day 7 or later, once ----
const s9 = nextVisit({ firstSeen: "2026-10-01", lastSeen: "2026-10-03", source: "x", ref: "c01" }, d("2026-10-12"), "x");
t("skip day 7, come back day 11: return_d7 fires", s9.events.includes("return_d7") && s9.state.d7 === true);
const s10 = nextVisit(s9.state, d("2026-10-20"), "x");
t("after that: never again", !s10.events.includes("return_d7"));
const s6 = nextVisit({ firstSeen: "2026-10-01", lastSeen: "2026-10-03", source: "x" }, d("2026-10-07"), "x");
t("day 6: no return_d7", !s6.events.includes("return_d7"));
const mig = nextVisit({ firstSeen: "2026-10-01", lastSeen: "2026-10-08", source: "x" }, d("2026-10-15"), "x");
t("migration: already visited on day 7+ under old logic -> no duplicate", !mig.events.includes("return_d7") && mig.state.d7 === true);

// ---- ref on events ----
t("ref attached to draft_start/sim_complete/share_click/return_d7/visit",
  ["draft_start", "sim_complete", "share_click", "return_d7", "visit"].every((e) => eventBody(e as never, "d0", "x", "none", "c04").ref === "c04"));
t("ref not attached to return_d1/daily_complete",
  ["return_d1", "daily_complete"].every((e) => eventBody(e as never, "d1", "x", "none", "c04").ref === "none"));
t("no ref -> none", eventBody("draft_start", "d0", "x", "classic", undefined).ref === "none");
t("body has only 5 fields", Object.keys(eventBody("visit", "d0", "x", "none", "c01")).sort().join() === "bucket,event,mode,ref,source");

const writes: unknown[] = [];
const env = { RETENTION: { writeDataPoint: (p: unknown) => writes.push(p) } };
const req = (b: unknown) => new Request("https://x/e", { method: "POST", body: JSON.stringify(b), headers: { "user-agent": "UA", "cf-connecting-ip": "1.2.3.4" } });
const r1 = await handleRetentionEvent(req({ event: "visit", bucket: "d1", mode: "none", source: "x" }), env);
t("valid -> 204 + one point", r1.status === 204 && writes.length === 1);
t("point has no IP/UA", !JSON.stringify(writes[0]).includes("1.2.3.4") && !JSON.stringify(writes[0]).includes("UA"));
await handleRetentionEvent(req({ event: "hack", bucket: "d1", source: "x" }), env);
await handleRetentionEvent(req({ event: "visit", bucket: "d1", source: "my-name" }), env);
t("invalid enums dropped", writes.length === 1);
const r2 = await handleRetentionEvent(req({ event: "visit", bucket: "d0", source: "x" }), {});
t("missing binding -> 204 no-op", r2.status === 204);
writes.length = 0;
await handleRetentionEvent(req({ event: "draft_start", bucket: "d0", mode: "classic", source: "other", ref: "c07" }), env);
await handleRetentionEvent(req({ event: "draft_start", bucket: "d0", mode: "classic", source: "other", ref: "raffael@example.com" }), env);
await handleRetentionEvent(req({ event: "draft_start", bucket: "d0", mode: "classic", source: "other" }), env);
const blobs = writes.map((w) => (w as { blobs: string[] }).blobs[4]);
t("server: valid ref is blob5, invalid/missing -> none", blobs.join() === "c07,none,none");

// ---- report ----
const sum = summarize([
  { ref: "c01", event: "visit", bucket: "d0", n: "10" },
  { ref: "c01", event: "visit", bucket: "d1", n: "4" },
  { ref: "c01", event: "sim_complete", bucket: "d0", n: "8" },
  { ref: "c01", event: "share_click", bucket: "d0", n: "2" },
  { ref: "c01", event: "return_d7", bucket: "d7", n: "3" },
  { ref: "none", event: "visit", bucket: "d0", n: "5" },
  { ref: "c02", event: "draft_start", bucket: "d0", n: 1 },
]);
t("report order c01,c02,none", sum.map((s) => s.ref).join() === "c01,c02,none");
t("report rates", sum[0]!.firstVisits === 10 && sum[0]!.shareRate === 0.25 && sum[0]!.returnRate === 0.3 && sum[1]!.shareRate === null);
t("report table renders", formatTable(sum).split("\n").length === 5);
t("sql clamps days", reportSql(500).includes("'90' DAY") && reportSql(0).includes("'30' DAY") && reportSql(-3).includes("'1' DAY"));
// ---- internal traffic marker ----
t("traffic: token/headless -> internal, normal UA/none -> public",
  trafficFor(`Mozilla/5.0 ${INTERNAL_UA_TOKEN}`) === "internal" && trafficFor("Mozilla/5.0 HeadlessChrome/120") === "internal" &&
  trafficFor("Mozilla/5.0 (iPhone) Safari") === "public" && trafficFor(null) === "public");
writes.length = 0;
await handleRetentionEvent(new Request("https://x/e", { method: "POST", body: JSON.stringify({ event: "visit", bucket: "d0", source: "x" }), headers: { "user-agent": `curl/8 ${INTERNAL_UA_TOKEN}` } }), env);
await handleRetentionEvent(req({ event: "visit", bucket: "d0", source: "x" }), env);
t("server: blob6 = internal/public, UA itself not stored",
  writes.map((w) => (w as { blobs: string[] }).blobs[5]).join() === "internal,public" && !JSON.stringify(writes).includes("curl"));
t("sql excludes internal", reportSql(7).includes("blob6 != 'internal'"));
t("GET -> 405", (await handleRetentionEvent(new Request("https://x/e"), env)).status === 405);
process.exit(fails ? 1 : 0);
