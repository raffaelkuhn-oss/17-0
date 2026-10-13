// Run: bun scripts/test-retention.ts
import { bucketFor, nextVisit, sourceBucket } from "../src/lib/retention";
import { handleRetentionEvent } from "../src/lib/retention-server";
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
t("state has only 3 fields", Object.keys(c.state).sort().join() === "firstSeen,lastSeen,source");

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
t("GET -> 405", (await handleRetentionEvent(new Request("https://x/e"), env)).status === 405);
process.exit(fails ? 1 : 0);
