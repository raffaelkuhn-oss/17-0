// Run: bun scripts/test-outcome.ts
// sim_complete outcome bucket (blob8): closed 5-value allow-list + mapping from real simulate() results.
import { FORMATION, PLAYERS, overall } from "../src/lib/players";
import { PLAYOFF_CUTOFF, simulate, type Campaign } from "../src/lib/sim";
import { OUTCOMES, eventBody, outcomeOf, parseOutcome } from "../src/lib/retention";
import { handleRetentionEvent } from "../src/lib/retention-server";
let fails = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? "PASS " : "FAIL ") + n);
  if (!c) fails++;
};

// ---- allow-list ----
t("exactly the 5 values", OUTCOMES.join() === "perfect,champion,final,ko,league");
t(
  "parseOutcome accepts each value",
  OUTCOMES.every((o) => parseOutcome(o) === o),
);
const BAD: unknown[] = [
  "",
  " perfect",
  "perfect ",
  "PERFECT",
  "Perfect",
  "KO",
  "League",
  "perfect,ko",
  "perfectx",
  "xko",
  "ko\n",
  "ko\u0000",
  "17-0",
  "semi",
  "playoff",
  "none",
  "champion;DROP TABLE",
  "<script>",
  "final' OR '1'='1",
  "c01",
  "__proto__",
  "constructor",
  "toString",
  null,
  undefined,
  1,
  true,
  ["ko"],
  { o: "ko" },
];
t(
  "parseOutcome rejects invalid / uppercase / padded / extra / injected / non-string",
  BAD.every((v) => parseOutcome(v) === null),
);

// ---- client body: outcome only on sim_complete, clamped ----
t(
  "body: valid outcome on sim_complete",
  eventBody("sim_complete", "d0", "x", "classic", null, undefined, "ko").outcome === "ko",
);
t(
  "body: classic and Legend IQ sim_complete carry the outcome",
  (["classic", "legend"] as const).every(
    (m) => eventBody("sim_complete", "d0", "x", m, null, undefined, "perfect").outcome === "perfect",
  ),
);
t(
  "body: daily sim_complete never carries an outcome, even a valid one",
  OUTCOMES.every((o) => {
    const b = eventBody("sim_complete", "d0", "x", "daily", null, undefined, o);
    return !("outcome" in b) && Object.keys(b).sort().join() === "bucket,event,mode,ref,source,via";
  }),
);
t(
  "body: invalid outcome is dropped, event otherwise unchanged",
  BAD.every((v) => {
    const b = eventBody("sim_complete", "d0", "x", "classic", null, undefined, v as never);
    return !("outcome" in b) && Object.keys(b).sort().join() === "bucket,event,mode,ref,source,via";
  }),
);
t(
  "body: no outcome on any other event",
  (
    ["visit", "draft_start", "daily_complete", "share_click", "return_d1", "return_d7"] as const
  ).every((e) => !("outcome" in eventBody(e, "d0", "x", "classic", null, undefined, "perfect"))),
);

// DraftGame: Daily runs pass no outcome to trackEvent; classic / Legend IQ pass outcomeOf(campaign).
const dg = (await import("node:fs")).readFileSync(new URL("../src/components/DraftGame.tsx", import.meta.url), "utf8");
t(
  "DraftGame: sim_complete sends no outcome for Daily, outcomeOf(campaign) otherwise",
  dg.includes('trackEvent("sim_complete", isDaily ? "daily" : mode, undefined, isDaily ? undefined : outcomeOf(campaign));'),
);

// ---- server: blob8 ----
const writes: { blobs: string[]; doubles: number[] }[] = [];
const env = { RETENTION: { writeDataPoint: (p: unknown) => writes.push(p as never) } };
const req = (b: unknown) =>
  new Request("https://x/e", {
    method: "POST",
    body: JSON.stringify(b),
    headers: { "user-agent": "UA" },
  });
const base = { event: "sim_complete", bucket: "d0", mode: "classic", source: "x", ref: "c01" };
for (const o of OUTCOMES) await handleRetentionEvent(req({ ...base, outcome: o }), env);
t("server: each valid outcome -> blob8", writes.map((w) => w.blobs[7]).join() === OUTCOMES.join());
t(
  "server: blobs 1-7 unchanged",
  writes.every(
    (w) =>
      w.blobs.slice(0, 7).join() === "sim_complete,d0,classic,x,c01,public,none" &&
      w.doubles.join() === "1",
  ),
);
writes.length = 0;
for (const v of BAD) await handleRetentionEvent(req({ ...base, outcome: v }), env);
await handleRetentionEvent(req(base), env); // missing
t(
  "server: invalid/missing outcome -> blob8 '' and the event still logs",
  writes.length === BAD.length + 1 &&
    writes.every((w) => w.blobs[7] === "" && w.blobs[0] === "sim_complete"),
);
writes.length = 0;
await handleRetentionEvent(
  req({ ...base, event: "share_click", via: "x", outcome: "perfect" }),
  env,
);
await handleRetentionEvent(
  req({ ...base, event: "daily_complete", mode: "daily", outcome: "perfect" }),
  env,
);
t(
  "server: outcome ignored on other events",
  writes.length === 2 && writes.every((w) => w.blobs[7] === "" && w.blobs.length === 8),
);
writes.length = 0;
for (const o of OUTCOMES) await handleRetentionEvent(req({ ...base, mode: "daily", outcome: o }), env);
t(
  "server: daily sim_complete -> blob8 '' even with a valid outcome, event still logged",
  writes.length === OUTCOMES.length &&
    writes.every(
      (w) => w.blobs[7] === "" && w.blobs.slice(0, 3).join() === "sim_complete,d0,daily" && w.blobs.length === 8,
    ),
);
writes.length = 0;
for (const m of ["classic", "legend"]) await handleRetentionEvent(req({ ...base, mode: m, outcome: "champion" }), env);
t("server: classic and Legend IQ still store the outcome", writes.map((w) => w.blobs[7]).join() === "champion,champion");
writes.length = 0;
await handleRetentionEvent(
  req({ ...base, outcome: "ko", score: "3-1", picks: ["Messi"], id: "abc" }),
  env,
);
t(
  "server: extra fields never stored",
  writes.length === 1 &&
    !JSON.stringify(writes[0]).match(/3-1|Messi|abc/) &&
    writes[0]!.blobs.length === 8,
);

// ---- mapping ----
const c = (x: Partial<Campaign>) =>
  ({ perfect: false, champion: false, eliminatedIn: null, ...x }) as Campaign;
t("map: perfect", outcomeOf(c({ perfect: true, champion: true })) === "perfect");
t("map: champion, not perfect", outcomeOf(c({ champion: true })) === "champion");
t("map: lost the final", outcomeOf(c({ eliminatedIn: "Final" })) === "final");
t("map: playoff loss -> ko", outcomeOf(c({ eliminatedIn: "Playoff" })) === "ko");
t(
  "map: R16/QF/SF loss -> ko",
  ["Round of 16", "Quarter-Final", "Semi-Final"].every(
    (r) => outcomeOf(c({ eliminatedIn: r })) === "ko",
  ),
);
t("map: league phase -> league", outcomeOf(c({ eliminatedIn: "League Phase" })) === "league");

// Real engine: classify many seasons of the top-rated XI and check each bucket against the raw results.
const best: (typeof PLAYERS)[number][] = [];
for (const s of FORMATION)
  best.push(
    PLAYERS.filter((p) => p.roles.includes(s.role) && !best.includes(p)).sort(
      (a, b) => overall(b) - overall(a),
    )[0]!,
  );
const weak = FORMATION.map(
  (s) =>
    PLAYERS.filter((p) => p.roles.includes(s.role)).sort((a, b) => overall(a) - overall(b))[0]!,
);
const seen = new Map<string, number>();
let consistent = true;
for (const xi of [best, weak])
  for (let seed = 1; seed <= 20000; seed++) {
    const g = simulate(xi, seed);
    const o = outcomeOf(g);
    seen.set(o, (seen.get(o) ?? 0) + 1);
    const last = g.results[g.results.length - 1]!;
    const ok =
      o === "perfect"
        ? g.won === 17 && g.drawn === 0 && g.lost === 0 && g.champion
        : o === "champion"
          ? g.champion && g.won < 17 && last.round === "THE FINAL" && last.outcome === "W"
          : o === "final"
            ? !g.champion && last.round === "THE FINAL" && last.outcome === "L"
            : o === "ko"
              ? !g.champion &&
                g.points >= PLAYOFF_CUTOFF &&
                g.results.length > 8 &&
                last.round !== "THE FINAL"
              : g.results.length === 8 && g.points < PLAYOFF_CUTOFF;
    if (!ok) consistent = false;
  }
t(
  `engine: all 5 outcomes occur (${[...seen].map(([k, v]) => `${k} ${v}`).join(", ")})`,
  OUTCOMES.every((o) => (seen.get(o) ?? 0) > 0),
);
t("engine: every season's bucket matches its raw results (40,000 seasons)", consistent);

if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
