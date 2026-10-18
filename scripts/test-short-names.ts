// Share-card short names: unique across legends + live, deterministic, overrides valid.
// The runtime module covers legends only (it ships to the client); this test imports the live pool
// so live names are still covered, and checks live players get their short name from the server path.
import { readFileSync } from "node:fs";
import { POOL_NAMES, SHORT_NAME_OVERRIDES, buildShortNames, candidateShortName, shortName, surname } from "../src/lib/short-name";
import { CURRENT_PLAYERS } from "../src/lib/live/current-players";
import { buildLivePlayers } from "../src/lib/live/form";
import { ALL_SHORT_NAME_OVERRIDES, LIVE_SHORT_NAME_OVERRIDES } from "../src/lib/live/short-overrides";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const ALL = [...POOL_NAMES, ...CURRENT_PLAYERS.map((p) => p.name)];
const map = buildShortNames(ALL, ALL_SHORT_NAME_OVERRIDES);
const shown = ALL.map((n) => map.get(n)!);
const dupes = shown.filter((s, i) => shown.findIndex((x) => x.toLowerCase() === s.toLowerCase()) !== i);
t(`every display name is unique across legends + live (${ALL.length} players)`, dupes.length === 0);
const legendOnly = buildShortNames(POOL_NAMES);
const drift = POOL_NAMES.filter((n) => legendOnly.get(n) !== map.get(n));
t(`legend short names are the same with or without the live pool (drift: ${drift.map((n) => `${n}: ${legendOnly.get(n)} vs ${map.get(n)}`).join("; ") || "none"})`, drift.length === 0);
const keptFull = ALL.filter((n) => map.get(n) === n && candidateShortName(n, ALL_SHORT_NAME_OVERRIDES) !== n);
console.log(`  kept full (ambiguous short name): ${keptFull.join(", ")}`);
t("ambiguous surnames keep the full name", ["Thiago Silva", "David Silva", "Bernardo Silva", "Gerd Müller", "Thomas Müller"].every((n) => map.get(n) === n));
t("mock A forms", shortName({ name: "Roberto Carlos" }) === "R. Carlos" && shortName({ name: "Cafu" }) === "Cafu" && shortName({ name: "Xavi Hernández" }) === "Xavi" && shortName({ name: "Andriy Shevchenko" }) === "Shevchenko");
t("particles kept", surname("Edwin van der Sar") === "van der Sar" && surname("Alfredo Di Stéfano") === "Di Stéfano" && surname("Kevin De Bruyne") === "De Bruyne" && surname("Alessandro Del Piero") === "Del Piero");
t("every legend override names a legend", Object.keys(SHORT_NAME_OVERRIDES).every((n) => POOL_NAMES.includes(n)));
t("every live override names a live player (and no legend)", Object.keys(LIVE_SHORT_NAME_OVERRIDES).every((n) => CURRENT_PLAYERS.some((p) => p.name === n) && !POOL_NAMES.includes(n)));
t("deterministic", JSON.stringify([...buildShortNames(ALL, ALL_SHORT_NAME_OVERRIDES)]) === JSON.stringify([...map]));
t("unknown names stay full", shortName({ name: "Someone New" }) === "Someone New");
// 20 Nov live pool: short names are computed server-side in buildLivePlayers and used by shortName().
const live = buildLivePlayers(null);
t("every live player carries its server-computed short name", live.every((p) => p.live?.short === map.get(p.name)));
t("shortName() uses a live player's short name", live.every((p) => shortName(p) === map.get(p.name)));
t("e.g. Vinícius Júnior -> Vinícius, Lautaro Martínez -> Lautaro (when live is on)", live.some((p) => p.name === "Vinícius Júnior" && shortName(p) === "Vinícius") && live.some((p) => p.name === "Lautaro Martínez" && shortName(p) === "Lautaro"));
// Runtime must not pull in the live pool (client bundle); scripts/test-bundle-names.ts checks the build too.
const src = readFileSync(new URL("../src/lib/short-name.ts", import.meta.url), "utf8");
t("short-name.ts does not import current-players or anything under live/", !/from\s+["'][^"']*live\//.test(src) && !/current-players/.test(src.replace(/^\s*\*.*$/gm, "")));
const longest = shown.reduce((a, b) => (b.length > a.length ? b : a));
console.log(`  longest display name: ${longest} (${longest.length} chars)`);
process.exit(fails ? 1 : 0);
