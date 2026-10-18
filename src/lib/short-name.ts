/**
 * Short display names for the share card (Marketing mock A: "Cafu", "Xavi", "R. Carlos"), so names fit
 * the pitch cards at full size. Deterministic: an override for well-known short forms, else the
 * surname with its particles ("van Basten", "Di Stéfano", "De Bruyne"). A short name is used only
 * if it is unique across the whole pool (legends + live players); otherwise the full name stays.
 * scripts/test-short-names.ts checks uniqueness.
 */
import { PLAYERS, type Player } from "./players";
import { CURRENT_PLAYERS } from "./live/current-players";

/** Well-known short forms, where the plain surname would read wrong. */
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
  "Vinícius Júnior": "Vinícius",
  "Alisson Becker": "Alisson",
  "Lautaro Martínez": "Lautaro",
  "Trent Alexander-Arnold": "Trent",
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

export function candidateShortName(name: string): string {
  return SHORT_NAME_OVERRIDES[name] ?? surname(name);
}

/** Full name -> display name, for every name in the pool (ambiguous short names fall back to the full name). */
export function buildShortNames(names: readonly string[]): Map<string, string> {
  const count = new Map<string, number>();
  for (const n of names) {
    const s = candidateShortName(n).toLowerCase();
    count.set(s, (count.get(s) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const n of names) {
    const s = candidateShortName(n);
    out.set(n, (count.get(s.toLowerCase()) ?? 0) > 1 ? n : s);
  }
  return out;
}

export const POOL_NAMES: readonly string[] = [...PLAYERS.map((p) => p.name), ...CURRENT_PLAYERS.map((p) => p.name)];
const SHORT = buildShortNames(POOL_NAMES);

/** Display name for the share card; unknown names (e.g. a future pool) keep their full name. */
export function shortName(p: Pick<Player, "name">): string {
  return SHORT.get(p.name) ?? p.name;
}
