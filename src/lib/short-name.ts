/**
 * Short display names for the share card (Marketing mock A: "Cafu", "Xavi", "R. Carlos"), so names fit
 * the pitch cards at full size. Deterministic: an override for well-known short forms, else the
 * surname with its particles ("van Basten", "Di Stéfano", "De Bruyne"). A short name is used only
 * if it is unique across the whole pool (legends + live players); otherwise the full name stays.
 * scripts/test-short-names.ts checks uniqueness over legends + live names.
 *
 * Must NOT import src/lib/live/current-players.ts: this module ships in the client bundle, and the
 * flag-gated live pool stays server-side until it launches. Live players get their short name on the
 * server (buildLivePlayers sets player.live.short from buildShortNames over legends + live).
 */
import { PLAYERS, type Player } from "./players";

/** Well-known short forms for legends, where the plain surname would read wrong. Live (current)
 * players' forms live server-side in src/lib/live/short-overrides.ts (no live names in the client). */
export const SHORT_NAME_OVERRIDES: Record<string, string> = {
  "Roberto Carlos": "R. Carlos",
  "Cristiano Ronaldo": "C. Ronaldo",
  "Ronaldo Nazário": "Ronaldo",
  "Xavi Hernández": "Xavi",
  "Raúl González": "Raúl",
  "Neymar Jr": "Neymar",
  "Luís Nani": "Nani",
  "Sergi Roberto": "Sergi Roberto",
  "Nilton Santos": "Nilton Santos",
  "Juan Román Riquelme": "Riquelme",
};

const PARTICLES = new Set(["van", "der", "de", "di", "del", "da", "dos", "von"]);

/** Surname with any particles in front of it, e.g. "Edwin van der Sar" -> "van der Sar". */
export function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  let i = parts.length - 1;
  while (i - 1 > 0 && PARTICLES.has(parts[i - 1]!.toLowerCase())) i--;
  return parts.slice(i).join(" ");
}

export function candidateShortName(name: string, overrides: Record<string, string> = SHORT_NAME_OVERRIDES): string {
  return overrides[name] ?? surname(name);
}

/** Full name -> display name, for every name in the pool (ambiguous short names fall back to the full name). */
export function buildShortNames(names: readonly string[], overrides: Record<string, string> = SHORT_NAME_OVERRIDES): Map<string, string> {
  const count = new Map<string, number>();
  for (const n of names) {
    const s = candidateShortName(n, overrides).toLowerCase();
    count.set(s, (count.get(s) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const n of names) {
    const s = candidateShortName(n, overrides);
    out.set(n, (count.get(s.toLowerCase()) ?? 0) > 1 ? n : s);
  }
  return out;
}

/** Legend names only (runtime). The test checks these short names stay the same and unique when the
 * live pool is added, so enabling live players never makes a legend's card ambiguous. */
export const POOL_NAMES: readonly string[] = PLAYERS.map((p) => p.name);
const SHORT = buildShortNames(POOL_NAMES);

/** Display name for the share card: a live player's server-computed short name, else the legend map;
 * unknown names keep their full name. */
export function shortName(p: Pick<Player, "name" | "live">): string {
  return p.live?.short ?? SHORT.get(p.name) ?? p.name;
}
