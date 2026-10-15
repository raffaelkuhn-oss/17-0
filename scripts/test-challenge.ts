// Run: bun scripts/test-challenge.ts
import { readFileSync } from "node:fs";
import { PLAYERS_V1 } from "../src/lib/legacy/players-v1";
import {
  decodeChallenge,
  encodeChallenge,
  replayChallenge,
  rngFactory,
  type Challenge,
} from "../src/lib/challenge";
import { simulate } from "../src/lib/sim";
let fails = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? "PASS " : "FAIL ") + n);
  if (!c) fails++;
};
const r = rngFactory(424242);
const rand = (): Challenge => ({
  mode: r() < 0.5 ? "classic" : "legend",
  seed: Math.floor(r() * 1e9),
  picks: Array.from({ length: 11 }, () => Math.floor(r() * 4)),
});
let roundtrip = 0,
  same = 0,
  maxLen = 0;
for (let i = 0; i < 1000; i++) {
  const c = rand();
  const code = encodeChallenge(c);
  maxLen = Math.max(maxLen, code.length);
  const d = decodeChallenge(code);
  if (d && d.seed === c.seed && d.mode === c.mode && d.picks.join("") === c.picks.join(""))
    roundtrip++;
  const a = replayChallenge(c),
    b = replayChallenge(d ?? c);
  if (
    a &&
    b &&
    JSON.stringify(a.campaign) === JSON.stringify(b.campaign) &&
    JSON.stringify(simulate(a.picks, c.seed)) === JSON.stringify(a.campaign)
  )
    same++;
}
t(`1000 random links round-trip (${roundtrip})`, roundtrip === 1000);
t(`1000 links replay to the identical XI + result twice (${same})`, same === 1000);
t(`payload under 80 chars (max ${maxLen})`, maxLen < 80);
const good = encodeChallenge({
  mode: "classic",
  seed: 123456789,
  picks: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2],
});
const b64 = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const bad: [string, unknown][] = [
  ["empty", ""],
  ["not a string", 42],
  ["garbage", "%%%"],
  ["not base64", "!!!!"],
  ["too long", "A".repeat(200)],
  ["wrong version", b64("v9|c|21i3v9|01230123012")],
  ["bad mode", b64("v1|x|21i3v9|01230123012")],
  ["seed too big", b64("v1|c|zzzzzzz|01230123012")],
  ["negative seed", b64("v1|c|-1|01230123012")],
  ["10 picks", b64("v1|c|21i3v9|0123012301")],
  ["12 picks", b64("v1|c|21i3v9|012301230120")],
  ["index out of range", b64("v1|c|21i3v9|01234012301")],
  ["player ids instead", b64("v1|c|21i3v9|gk1,rb1")],
  ["forged result field", b64("v1|c|21i3v9|01230123012|17-0")],
  ["truncated", good.slice(0, -3)],
];
for (const [n, v] of bad) t(`tampered: ${n} -> null (fallback)`, decodeChallenge(v) === null);
t("valid link still decodes", decodeChallenge(good) !== null);
{
  const legacy = encodeChallenge({
    mode: "classic",
    seed: 42,
    picks: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    version: "v1",
  });
  const d = decodeChallenge(legacy);
  t("legacy v1 link still decodes", !!d && d.version === "v1");
  const r = d && replayChallenge(d);
  t(
    "legacy v1 replays against the frozen pool",
    !!r && r.picks.every((p) => PLAYERS_V1.some((x) => x.id === p.id)),
  );
}
const daily = readFileSync(new URL("../src/routes/daily.tsx", import.meta.url), "utf8");
t("daily route does not use challenge links", !daily.includes("lib/challenge"));
const game = readFileSync(new URL("../src/components/DraftGame.tsx", import.meta.url), "utf8");
t(
  "challenge runs never fire daily events",
  /const isDaily = fixedSeed !== undefined && !challenge/.test(game),
);
if (fails) {
  console.log(`${fails} failed`);
  process.exit(1);
}
