// Run: bun scripts/test-daily-grace.ts
import { FORMATION } from "../src/lib/players";
import { PLAYERS_V1 } from "../src/lib/legacy/players-v1";
import { candidatesFor } from "../src/lib/sim";
import { dailySeed, DAILY_POOL_VERSION } from "../src/lib/daily";
import {
  DAILY_GRACE_UNTIL_MS,
  DAILY_POOL_VERSION_LEGACY,
  dailySeedLegacy,
  isDailyGraceActive,
  resolveDailyDraft,
  verifyDraft,
} from "../src/lib/daily-draft";

let fails = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? "PASS " : "FAIL ") + n);
  if (!c) fails++;
};

const dayKey = "2026-10-15";
function rngFactory(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function draftNames(seed: number, pool: readonly { id: string; name: string; roles: string[] }[]) {
  const picks: { id: string; name: string; roles: string[] }[] = [];
  for (let step = 0; step < FORMATION.length; step++) {
    const offered = candidatesFor(
      FORMATION[step]!.role,
      new Set(picks.map((p) => p.id)),
      4,
      rngFactory(seed + step * 7919),
      pool as any,
    );
    picks.push(offered[0]!);
  }
  return picks.map((p) => p.name);
}

t("legacy seed differs from v2 seed", dailySeedLegacy(dayKey) !== dailySeed(dayKey));
t("v2 seed material includes version", DAILY_POOL_VERSION === "v2");

const legacyNames = draftNames(dailySeedLegacy(dayKey), PLAYERS_V1);
const duringGrace = DAILY_GRACE_UNTIL_MS - 60_000;
const afterGrace = DAILY_GRACE_UNTIL_MS + 60_000;
t("grace active before cutoff", isDailyGraceActive(duringGrace));
t("grace inactive after cutoff", !isDailyGraceActive(afterGrace));

const accepted = resolveDailyDraft(legacyNames, dayKey, duringGrace);
t(
  "legacy draft accepted during grace",
  !!accepted && accepted.version === DAILY_POOL_VERSION_LEGACY,
);
t("legacy draft rejected after grace", resolveDailyDraft(legacyNames, dayKey, afterGrace) === null);

const v2Names = draftNames(dailySeed(dayKey), (await import("../src/lib/players")).PLAYERS);
const v2 = resolveDailyDraft(v2Names, dayKey, afterGrace);
t("new-pool draft accepted after grace", !!v2 && v2.version === "v2");
t("new-pool draft accepted during grace too", !!resolveDailyDraft(v2Names, dayKey, duringGrace));

t(
  "verifyDraft rejects a mixed-up name list",
  verifyDraft(
    ["Not A Real Player", ...legacyNames.slice(1)],
    dailySeedLegacy(dayKey),
    PLAYERS_V1,
  ) === null,
);

if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
