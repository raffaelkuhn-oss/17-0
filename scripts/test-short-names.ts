// Share-card short names: unique across the pool (legends + live), deterministic, overrides valid.
import { POOL_NAMES, SHORT_NAME_OVERRIDES, buildShortNames, candidateShortName, shortName, surname } from "../src/lib/short-name";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const map = buildShortNames(POOL_NAMES);
const shown = POOL_NAMES.map((n) => map.get(n)!);
const dupes = shown.filter((s, i) => shown.findIndex((x) => x.toLowerCase() === s.toLowerCase()) !== i);
t(`every display name is unique in the pool (${POOL_NAMES.length} players)`, dupes.length === 0);
const keptFull = POOL_NAMES.filter((n) => map.get(n) === n && candidateShortName(n) !== n);
console.log(`  kept full (ambiguous short name): ${keptFull.join(", ")}`);
t("ambiguous surnames keep the full name", ["Thiago Silva", "David Silva", "Bernardo Silva", "Gerd Müller", "Thomas Müller"].every((n) => map.get(n) === n));
t("mock A forms", shortName({ name: "Roberto Carlos" }) === "R. Carlos" && shortName({ name: "Cafu" }) === "Cafu" && shortName({ name: "Xavi Hernández" }) === "Xavi" && shortName({ name: "Andriy Shevchenko" }) === "Shevchenko");
t("particles kept", surname("Edwin van der Sar") === "van der Sar" && surname("Alfredo Di Stéfano") === "Di Stéfano" && surname("Kevin De Bruyne") === "De Bruyne" && surname("Alessandro Del Piero") === "Del Piero");
t("every override names a real pool player", Object.keys(SHORT_NAME_OVERRIDES).every((n) => POOL_NAMES.includes(n)));
t("deterministic", JSON.stringify([...buildShortNames(POOL_NAMES)]) === JSON.stringify([...map]));
t("unknown names stay full", shortName({ name: "Someone New" }) === "Someone New");
const longest = shown.reduce((a, b) => (b.length > a.length ? b : a));
console.log(`  longest display name: ${longest} (${longest.length} chars)`);
process.exit(fails ? 1 : 0);
