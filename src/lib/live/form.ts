import { ROLE_GROUP, overall, type Player } from "../players";
import { CURRENT_PLAYERS, type CurrentPlayerDef } from "./current-players";

/**
 * Weekly form formula (Notion spec "Live current players" §4), deterministic and pure.
 *
 *   events = goals × (FWD ? 1 : 1.5) + assists × 0.5
 *          + Σ team CL matches in the window: win +0.5, draw 0, loss −0.5
 *          + GK/DEF only: +1 per clean sheet (from the final score)
 *   form'  = clamp(round(0.7 × form + events), form − 3, form + 3), then clamp to [−5, +5]
 *
 * Goals/assists are DELTAS of the cumulative CL scorers list between runs (first run only
 * records the baseline). The free tier has no line-ups or minutes, so "did not play" (−0.5)
 * and per-90 rates are NOT used. Effective stats = base stats + form (each capped 40..99),
 * so effective overall ≈ base overall + form.
 */
export const FORM_MAX = 5;
export const WEEKLY_MAX = 3;
export const DECAY = 0.7;

export type FdScorer = {
  player: { id: number; name: string };
  team: { id: number };
  goals: number | null;
  assists: number | null;
};
export type FdMatch = {
  id: number;
  status: string;
  utcDate: string;
  homeTeam: { id: number };
  awayTeam: { id: number };
  score: { winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null; fullTime: { home: number | null; away: number | null } };
};

export type PlayerFormState = { form: number; goals: number; assists: number; lastDelta: number; note: string };
export type FormState = {
  version: 1;
  updatedAt: string; // ISO
  windowFrom: string; // yyyy-mm-dd of the matches window used
  players: Record<string, PlayerFormState>;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export function findScorer(def: CurrentPlayerDef, scorers: FdScorer[]): FdScorer | undefined {
  if (def.fdPersonId != null) return scorers.find((s) => s.player.id === def.fdPersonId);
  const n = norm(def.name);
  return scorers.find((s) => s.team.id === def.fdTeamId && (norm(s.player.name) === n || norm(s.player.name).endsWith(n) || n.endsWith(norm(s.player.name))));
}

export function teamEvents(teamId: number, matches: FdMatch[], defensive: boolean) {
  let pts = 0, w = 0, d = 0, l = 0, cs = 0;
  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    const home = m.homeTeam.id === teamId;
    if (!home && m.awayTeam.id !== teamId) continue;
    const ga = home ? m.score.fullTime.away : m.score.fullTime.home;
    const won = m.score.winner === (home ? "HOME_TEAM" : "AWAY_TEAM");
    const lost = m.score.winner === (home ? "AWAY_TEAM" : "HOME_TEAM");
    if (won) { pts += 0.5; w++; } else if (lost) { pts -= 0.5; l++; } else d++;
    if (defensive && ga === 0) { pts += 1; cs++; }
  }
  return { pts, w, d, l, cs };
}

export function nextForm(prev: number, events: number): number {
  const raw = Math.round(DECAY * prev + events);
  return clamp(clamp(raw, prev - WEEKLY_MAX, prev + WEEKLY_MAX), -FORM_MAX, FORM_MAX) + 0; // +0 drops -0
}

/** One weekly step for every current player. `prev` null = first run (baseline). */
export function computeWeeklyForm(
  prev: FormState | null,
  scorers: FdScorer[],
  matches: FdMatch[],
  now: Date,
  windowFrom: string,
  defs: CurrentPlayerDef[] = CURRENT_PLAYERS,
): FormState {
  const players: Record<string, PlayerFormState> = {};
  for (const def of defs) {
    const group = ROLE_GROUP[def.roles[0]!];
    const p = prev?.players[def.id];
    const s = findScorer(def, scorers);
    const goals = s?.goals ?? p?.goals ?? 0;
    const assists = s?.assists ?? p?.assists ?? 0;
    const dg = p ? Math.max(0, goals - p.goals) : 0;
    const da = p ? Math.max(0, assists - p.assists) : 0;
    const t = teamEvents(def.fdTeamId, matches, group === "GK" || group === "DEF");
    const events = dg * (group === "FWD" ? 1 : 1.5) + da * 0.5 + t.pts;
    const before = p?.form ?? 0;
    const form = nextForm(before, events);
    const bits = [dg && `${dg} goal${dg > 1 ? "s" : ""}`, da && `${da} assist${da > 1 ? "s" : ""}`, t.w && `${t.w}W`, t.d && `${t.d}D`, t.l && `${t.l}L`, t.cs && `${t.cs} clean sheet${t.cs > 1 ? "s" : ""}`].filter(Boolean);
    players[def.id] = { form, goals, assists, lastDelta: form - before, note: bits.join(", ") || "no CL action" };
  }
  return { version: 1, updatedAt: now.toISOString(), windowFrom, players };
}

/** Builds draftable Player objects; missing state = base ratings (form 0). */
export function buildLivePlayers(state: FormState | null, defs: CurrentPlayerDef[] = CURRENT_PLAYERS): Player[] {
  return defs.map((d) => {
    const form = clamp(Math.round(state?.players[d.id]?.form ?? 0), -FORM_MAX, FORM_MAX);
    const base: Player = { id: d.id, name: d.name, roles: d.roles, club: d.club, era: "Current", att: d.att, def: d.def, tec: d.tec, men: d.men };
    const adj = (v: number) => clamp(v + form, 40, 99);
    return { ...base, att: adj(d.att), def: adj(d.def), tec: adj(d.tec), men: adj(d.men), live: { form, base: overall(base) } };
  });
}

/** Flag logic: prod switch, or preview switch + explicit ?live=1. Anything else = off. */
export function isLiveEnabled(vars: { LIVE_PLAYERS_ENABLED?: string | undefined; LIVE_PLAYERS_PREVIEW?: string | undefined }, previewRequested: boolean): boolean {
  if (vars.LIVE_PLAYERS_ENABLED === "1") return true;
  return previewRequested && vars.LIVE_PLAYERS_PREVIEW === "1";
}
