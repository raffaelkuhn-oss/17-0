// Build-output test: the client bundle must not contain legacy v1-only players or flag-gated live
// (current CL) players. Run after `bun run build`: `bun run test:bundle` (CI runs it right after the build).
// Not a test-*.ts file on purpose: it checks dist/, which `bun run test` (before the build) can't trust.
// What users and scanners see is the shipped bundle, not the source-of-truth pool.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PLAYERS } from "../src/lib/players";
import { PLAYERS_V1 } from "../src/lib/legacy/players-v1";
import { CURRENT_PLAYERS } from "../src/lib/live/current-players";

let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const dir = new URL("../dist/client", import.meta.url).pathname;
if (!existsSync(dir)) {
  console.error("FAIL dist/client missing: run `bun run build` first");
  process.exit(1);
}
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|mjs|html|json|css|txt|xml|webmanifest)$/.test(f)) files.push(p); } };
walk(dir);
const text = files.map((f) => [f, readFileSync(f, "utf8")] as const);
const live = new Set(PLAYERS.map((p) => p.name));
const liveIds = new Set(PLAYERS.map((p) => p.id));
const esc = (s: string) => JSON.stringify(s).slice(1, -1).replace(/[\u0080-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
const needles: { kind: string; s: string }[] = [];
for (const p of PLAYERS_V1) if (!live.has(p.name)) needles.push({ kind: "v1-only name", s: p.name });
for (const p of CURRENT_PLAYERS) { if (!live.has(p.name)) needles.push({ kind: "live-only name", s: p.name }); if (!liveIds.has(p.id)) needles.push({ kind: "live id", s: p.id }); }
const found: string[] = [];
for (const n of needles) {
  const forms = [...new Set([n.s, esc(n.s)])];
  const hit = text.find(([, c]) => forms.some((f) => c.includes(f)));
  if (hit) found.push(`${n.kind} "${n.s}" in ${hit[0].slice(dir.length + 1)}`);
}
t(`${files.length} client files, ${needles.length} needles (v1-only + live-only names and live ids): none in the bundle`, found.length === 0);
for (const f of found) console.log("  found: " + f);
t("sanity: the bundle does contain a live legend name (so the grep works)", text.some(([, c]) => c.includes(PLAYERS[0]!.name) || c.includes(esc(PLAYERS[0]!.name))));
if (fails) process.exit(1);
