/**
 * Legend rule check (docs/legend-rule.md): a pool legend must not be registered in THIS season's
 * UEFA Champions League squad. Flags any PLAYERS (and frozen PLAYERS_V1) legend whose name matches a
 * player in a current CL squad on football-data.org. WARNING ONLY: always exits 0 unless --strict.
 *
 * Usage: FOOTBALL_DATA_API_KEY=... bun scripts/legend-cl-check.ts [--names "Sergio Ramos,Paul Pogba"] [--include-v1] [--strict]
 *   --names       also report each named player's status explicitly (found in a CL squad or not)
 *   --include-v1  also check the frozen v1 pool (only decodes old share links; it is never drafted)
 * Exact name matches are WARN lines; same surname + same first initial (e.g. "Andy" vs "Andrew") is a
 * "possible" note to check by hand.
 * Requests: 1 (GET /v4/competitions/CL/teams, squads included); if squads come back empty, one
 * GET /v4/teams/{id} per team, spaced 6.5 s apart to stay under the free tier's 10 requests/minute.
 * Skips (exit 0) when the key is unset. The key is never printed.
 * HARD FAIL (exit 1, offline, before any request, key or not): a name in the live pool
 * (src/lib/live/current-players.ts) that also appears in the legend pool (src/lib/players.ts).
 */
import { PLAYERS, type Player } from "../src/lib/players";
import { PLAYERS_V1 } from "../src/lib/legacy/players-v1";
import { CURRENT_PLAYERS } from "../src/lib/live/current-players";

const API = "https://api.football-data.org/v4";
const MIN_GAP_MS = 6_500; // 10 requests/minute on the free tier
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const includeV1 = args.includes("--include-v1");
const namesArg = args.includes("--names") ? (args[args.indexOf("--names") + 1] ?? "") : "";
const key = (process.env["FOOTBALL_DATA_API_KEY"] ?? "").trim();

type SquadMember = { id: number; name: string; position?: string | null; dateOfBirth?: string | null; nationality?: string | null };
type Team = { id: number; name: string; area?: { name?: string }; squad?: SquadMember[] };

/** Lowercase, no accents, no punctuation, single spaces: "Luka Modrić" -> "luka modric". */
export function norm(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
/** Name variants a squad list may use: full name, without a "Jr"/"Junior" suffix. */
export function variants(name: string): string[] {
  const n = norm(name);
  return [...new Set([n, n.replace(/ (jr|junior)$/, "")])];
}
/** Loose key for "possible" matches: first initial + surname ("andrew robertson" -> "a robertson"). */
export function looseKey(name: string): string | null {
  const parts = norm(name).replace(/ (jr|junior)$/, "").split(" ");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1] ?? "";
  return last.length >= 4 ? `${(parts[0] ?? "")[0]} ${last}` : null;
}

/** Live-pool names that also appear in the legend pool (normalised, incl. "Jr" variants). Must be empty:
 * a current player is never a legend. */
export function liveLegendOverlap(legends: readonly { name: string }[] = PLAYERS, live: readonly { name: string }[] = CURRENT_PLAYERS): string[] {
  const legendKeys = new Set(legends.flatMap((p) => variants(p.name)));
  return live.filter((p) => variants(p.name).some((v) => legendKeys.has(v))).map((p) => p.name);
}

let last = 0;
async function get<T>(path: string): Promise<{ status: number; body: T | null }> {
  const wait = last + MIN_GAP_MS - Date.now();
  if (last && wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(API + path, { headers: { "X-Auth-Token": key } });
    if (res.status === 429 && attempt === 0) {
      const reset = Number(res.headers.get("x-requestcounter-reset") ?? "60");
      console.log(`rate limited; waiting ${reset}s`);
      await new Promise((r) => setTimeout(r, (Math.min(reset, 65) + 1) * 1000));
      continue;
    }
    return { status: res.status, body: res.ok ? ((await res.json()) as T) : null };
  }
  return { status: 429, body: null };
}

async function main() {
  const overlap = liveLegendOverlap();
  if (overlap.length) {
    console.log(`FAIL ${overlap.length} live-pool name(s) also in the legend pool (players.ts): ${overlap.join(", ")}`);
    return 1;
  }
  console.log(`ok: no live-pool name (${CURRENT_PLAYERS.length}) is in the legend pool (${PLAYERS.length})`);
  if (!key) {
    console.log("skip legend CL check: FOOTBALL_DATA_API_KEY not set");
    return 0;
  }
  const r = await get<{ season?: { startDate?: string; endDate?: string }; teams?: Team[] }>("/competitions/CL/teams");
  if (!r.body?.teams) {
    console.log(`warn legend CL check: football-data returned HTTP ${r.status}; no result (warning only)`);
    return strict ? 1 : 0;
  }
  const teams = r.body.teams;
  const season = r.body.season ? `${r.body.season.startDate ?? "?"} to ${r.body.season.endDate ?? "?"}` : "current";
  if (teams.every((t) => !t.squad?.length)) {
    console.log(`squads not included; fetching ${teams.length} teams at <= 10 requests/minute (~${Math.ceil((teams.length * MIN_GAP_MS) / 60000)} min)`);
    for (const t of teams) t.squad = (await get<Team>(`/teams/${t.id}`)).body?.squad ?? [];
  }
  const index = new Map<string, { player: SquadMember; team: Team }[]>();
  const loose = new Map<string, { player: SquadMember; team: Team }[]>();
  for (const t of teams) for (const p of t.squad ?? []) {
    const k = norm(p.name);
    index.set(k, [...(index.get(k) ?? []), { player: p, team: t }]);
    const lk = looseKey(p.name);
    if (lk) loose.set(lk, [...(loose.get(lk) ?? []), { player: p, team: t }]);
  }
  const squadSize = teams.reduce((n, t) => n + (t.squad?.length ?? 0), 0);
  console.log(`CL season ${season}: ${teams.length} teams, ${squadSize} squad players (football-data.org)`);

  const legends = new Map<string, { p: Player; pools: string[] }>();
  const pools: [string, readonly Player[]][] = [["players.ts", PLAYERS]];
  if (includeV1) pools.push(["players-v1.ts", PLAYERS_V1]);
  for (const [pool, list] of pools)
    for (const p of list) {
      const e = legends.get(p.name) ?? { p, pools: [] };
      e.pools.push(pool);
      legends.set(p.name, e);
    }
  const lookup = (name: string) => variants(name).flatMap((v) => index.get(v) ?? []);
  const lookupLoose = (name: string) => {
    const lk = looseKey(name);
    const exact = new Set(lookup(name).map((h) => h.player.id));
    return (lk ? (loose.get(lk) ?? []) : []).filter((h) => !exact.has(h.player.id));
  };
  const hits = [...legends.values()].flatMap(({ p, pools }) => lookup(p.name).map((h) => ({ p, pools, ...h })));
  if (hits.length === 0) console.log(`ok: no pool legend (${legends.size} names) is in a current CL squad`);
  for (const h of hits)
    console.log(
      `WARN legend in a current CL squad: ${h.p.name} (${h.pools.join(", ")}) -> ${h.team.name}` +
        `${h.player.dateOfBirth ? `, born ${h.player.dateOfBirth}` : ""}${h.player.position ? `, ${h.player.position}` : ""}. Check it is the same person.`,
    );
  for (const { p, pools } of legends.values())
    for (const h of lookupLoose(p.name))
      console.log(`note possible match: ${p.name} (${pools.join(", ")}) ~ ${h.player.name}, ${h.team.name}${h.player.dateOfBirth ? `, born ${h.player.dateOfBirth}` : ""}. Probably a different person; check by hand.`);
  for (const name of namesArg.split(",").map((s) => s.trim()).filter(Boolean)) {
    const found = lookup(name);
    const maybe = lookupLoose(name);
    console.log(
      `re-check ${name}: ${found.length ? `IN a CL squad (${found.map((f) => f.team.name).join(", ")})` : "not in any current CL squad"}` +
        (maybe.length ? `; possible: ${maybe.map((m) => `${m.player.name} (${m.team.name}, born ${m.player.dateOfBirth ?? "?"})`).join(", ")}` : ""),
    );
  }
  return hits.length && strict ? 1 : 0;
}

if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((e: unknown) => {
      console.log(`warn legend CL check failed: ${(e as Error).message.replaceAll(key || "\u0000", "[key]")} (warning only)`);
      process.exit(strict ? 1 : 0);
    });
}
