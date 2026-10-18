// Offline unit checks for scripts/legend-cl-check.ts name matching (no network).
import { liveLegendOverlap, looseKey, norm, variants } from "./legend-cl-check";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
t("accents and case", norm("Luka Modrić") === "luka modric" && norm("Éric Abidal") === "eric abidal");
t("punctuation", norm("N'Golo Kanté") === "n golo kante");
t("Jr variant", variants("Neymar Jr").includes("neymar"));
t("loose key", looseKey("Andrew Robertson") === looseKey("Andy Robertson") && looseKey("Rodri") === null);
t("no key: skips with exit 0", Bun.spawnSync(["bun", "scripts/legend-cl-check.ts"], { env: { ...process.env, FOOTBALL_DATA_API_KEY: "" } }).exitCode === 0);
t("no live-pool name is in the legend pool (players.ts vs current-players.ts)", liveLegendOverlap().length === 0);
t("overlap detection works (accents, Jr)", JSON.stringify(liveLegendOverlap([{ name: "Kylian Mbappe" }, { name: "Neymar" }], [{ name: "Kylian Mbappé" }, { name: "Neymar Jr" }, { name: "Pedri" }])) === JSON.stringify(["Kylian Mbappé", "Neymar Jr"]));
process.exit(fails ? 1 : 0);
