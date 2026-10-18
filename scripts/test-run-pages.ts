import { recordHeadline } from "../src/lib/record";
import { readFileSync } from "node:fs";
import ATLAS from "../src/assets/og/atlas.json";
import { encodeChallenge, CHALLENGE_VERSION_LEGACY } from "../src/lib/challenge";
import { PLAYERS } from "../src/lib/players";
import { PLAYERS_V1 } from "../src/lib/legacy/players-v1";
import { createHash } from "node:crypto";
import { OG_LAYOUT_SHA, OG_VERSION, RUN_OG_PATH, runFromCode, runOgPath, runTitle, upgradedOgPath } from "../src/lib/og/run-page";
import { renderRunPng } from "../src/lib/og/run-image";
import { shareText } from "../src/lib/share-text";
import { xiDare } from "../src/lib/xi-chance";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const atlas = new Uint8Array(readFileSync(new URL("../src/assets/og/atlas.bin", import.meta.url)));
const code = encodeChallenge({ mode: "classic", seed: 1000, picks: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2] });
const run = runFromCode(code);
t("valid v2 code rebuilds XI + campaign", !!run && run.picks.length === 11 && run.campaign.results.length >= 8 && !run.legacy);
t("rebuild is deterministic", JSON.stringify(runFromCode(code)?.campaign) === JSON.stringify(run?.campaign));
t("invalid codes -> null", [ "", "garbage", "%3Cscript%3E", code.slice(0, -2), "x".repeat(90)].every((c) => runFromCode(c) === null));
const v1 = encodeChallenge({ mode: "classic", seed: 1000, picks: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2], version: CHALLENGE_VERSION_LEGACY });
t("v1 code replays on the frozen pool", runFromCode(v1)?.legacy === true);
t("og path round-trip", RUN_OG_PATH.exec(runOgPath(code))?.[1] === code && runOgPath(code).endsWith(`og-v${OG_VERSION}.png`));
t("old og-v1 path upgrades to the current version", upgradedOgPath(`/r/${code}/og-v1.png`) === runOgPath(code) && OG_VERSION > 1);
t("current/future/bad og paths are not upgraded", upgradedOgPath(runOgPath(code)) === null && upgradedOgPath(`/r/${code}/og-v${OG_VERSION + 1}.png`) === null && upgradedOgPath("/r/x/og.png") === null);
// The og CTA copy comes from xiDare() (xi-chance.ts), so its output is part of the layout hash too:
// changing the dare copy must bump OG_VERSION like any other og layout change (og PNGs are cached immutable).
const layoutSha = createHash("sha256").update(readFileSync(new URL("../src/lib/og/run-image.ts", import.meta.url))).update(xiDare({ n: "N" })).digest("hex").slice(0, 16);
t(`og layout unchanged at v${OG_VERSION} (else bump OG_VERSION and set OG_LAYOUT_SHA=${layoutSha})`, layoutSha === OG_LAYOUT_SHA);
t("title has no betting words", !/odds|bet/i.test(runTitle(run!.campaign)));
t("share link points at /r/<code>", shareText({ campaign: run!.campaign, challengeCode: code, origin: "https://ucl17-0.com" }).url === `https://ucl17-0.com/r/${code}`);
const glyphs = (ATLAS.styles as unknown as Record<string, { glyphs: Record<string, unknown> }>).name!.glyphs;
const missing = new Set([...PLAYERS, ...PLAYERS_V1].flatMap((p) => [...p.name]).filter((ch) => !glyphs[ch]));
t(`atlas covers every player-name character (missing: ${[...missing].join("") || "none"})`, missing.size === 0);
// The big record is drawn from the "record" atlas style: every character the label can produce must be baked.
const recGlyphs = (ATLAS.styles as unknown as Record<string, { glyphs: Record<string, unknown> }>).record!.glyphs;
const recSamples = [{ won: 17, drawn: 0, lost: 0 }, { won: 11, drawn: 0, lost: 1 }, { won: 4, drawn: 10, lost: 3 }].map(recordHeadline);
const recMissing = new Set(recSamples.flatMap((s) => [...s]).filter((ch) => !recGlyphs[ch]));
t(`record atlas covers "${recSamples.join('", "')}" (missing: ${[...recMissing].join("") || "none"})`, recMissing.size === 0);
let maxSize = 0, ok = true;
for (let i = 0; i < 20; i++) {
  const r = runFromCode(encodeChallenge({ mode: i % 2 ? "legend" : "classic", seed: 5000 + i * 9973, picks: Array.from({ length: 11 }, (_, k) => (k + i) % 4) }));
  if (!r) continue;
  const png = await renderRunPng(r.picks, r.campaign, atlas);
  const dv = new DataView(png.buffer, png.byteOffset);
  ok &&= png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47 && dv.getUint32(16) === 1200 && dv.getUint32(20) === 630;
  maxSize = Math.max(maxSize, png.length);
}
t("renders valid 1200x630 PNGs", ok);
t(`PNG under 100 KB (max ${maxSize} B)`, maxSize > 5000 && maxSize < 100_000);
process.exit(fails ? 1 : 0);
