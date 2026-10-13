import type { Role } from "../players";

/**
 * Current Champions League players for the (flagged) live-form feature.
 * ONE LINE PER PLAYER: adding a player is a one-line change.
 * - id: stable, prefixed "cur-" so it never collides with a legend id.
 * - club: plain text only (no crests). roles: first = natural role.
 * - att/def/tec/men: base ratings set by hand (conservative, like the legends). Base rating = overall().
 * - fdTeamId: football-data.org team id. fdPersonId: football-data.org person id, or null to
 *   match the scorers list by name + team (fill it in once seen in a real response).
 * Clubs/ids are as of Oct 2026; re-check each knockout round (spec §7: rotate eliminated clubs).
 */
export type CurrentPlayerDef = {
  id: string; name: string; club: string; roles: Role[];
  att: number; def: number; tec: number; men: number;
  fdTeamId: number; fdPersonId: number | null;
};

export const CURRENT_PLAYERS: CurrentPlayerDef[] = [
  { id: "cur-donnarumma", name: "Gianluigi Donnarumma", club: "Man City", roles: ["GK"], att: 60, def: 88, tec: 76, men: 86, fdTeamId: 65, fdPersonId: null },
  { id: "cur-raya", name: "David Raya", club: "Arsenal", roles: ["GK"], att: 60, def: 85, tec: 82, men: 82, fdTeamId: 57, fdPersonId: null },
  { id: "cur-kounde", name: "Jules Koundé", club: "Barcelona", roles: ["RB", "CB"], att: 72, def: 85, tec: 80, men: 82, fdTeamId: 81, fdPersonId: null },
  { id: "cur-saliba", name: "William Saliba", club: "Arsenal", roles: ["CB"], att: 62, def: 88, tec: 80, men: 84, fdTeamId: 57, fdPersonId: null },
  { id: "cur-bastoni", name: "Alessandro Bastoni", club: "Inter", roles: ["CB", "LB"], att: 66, def: 86, tec: 82, men: 83, fdTeamId: 108, fdPersonId: null },
  { id: "cur-nunomendes", name: "Nuno Mendes", club: "Paris SG", roles: ["LB"], att: 78, def: 82, tec: 82, men: 82, fdTeamId: 524, fdPersonId: null },
  { id: "cur-rice", name: "Declan Rice", club: "Arsenal", roles: ["DM", "CM"], att: 74, def: 84, tec: 83, men: 85, fdTeamId: 57, fdPersonId: null },
  { id: "cur-kimmich", name: "Joshua Kimmich", club: "Bayern München", roles: ["DM", "RB"], att: 72, def: 82, tec: 87, men: 86, fdTeamId: 5, fdPersonId: null },
  { id: "cur-pedri", name: "Pedri", club: "Barcelona", roles: ["CM", "AM"], att: 76, def: 72, tec: 90, men: 82, fdTeamId: 81, fdPersonId: null },
  { id: "cur-vitinha", name: "Vitinha", club: "Paris SG", roles: ["CM", "DM"], att: 74, def: 76, tec: 88, men: 84, fdTeamId: 524, fdPersonId: null },
  { id: "cur-macallister", name: "Alexis Mac Allister", club: "Liverpool", roles: ["CM", "DM"], att: 76, def: 78, tec: 86, men: 84, fdTeamId: 64, fdPersonId: null },
  { id: "cur-wirtz", name: "Florian Wirtz", club: "Liverpool", roles: ["AM", "LW"], att: 84, def: 58, tec: 89, men: 80, fdTeamId: 64, fdPersonId: null },
  { id: "cur-musiala", name: "Jamal Musiala", club: "Bayern München", roles: ["AM", "LW"], att: 84, def: 58, tec: 89, men: 81, fdTeamId: 5, fdPersonId: null },
  { id: "cur-palmer", name: "Cole Palmer", club: "Chelsea", roles: ["AM", "RW"], att: 85, def: 55, tec: 87, men: 84, fdTeamId: 61, fdPersonId: null },
  { id: "cur-yamal", name: "Lamine Yamal", club: "Barcelona", roles: ["RW"], att: 87, def: 50, tec: 91, men: 82, fdTeamId: 81, fdPersonId: null },
  { id: "cur-olise", name: "Michael Olise", club: "Bayern München", roles: ["RW", "AM"], att: 85, def: 52, tec: 87, men: 80, fdTeamId: 5, fdPersonId: null },
  { id: "cur-dembele", name: "Ousmane Dembélé", club: "Paris SG", roles: ["RW", "ST"], att: 88, def: 50, tec: 86, men: 84, fdTeamId: 524, fdPersonId: null },
  { id: "cur-lautaro", name: "Lautaro Martínez", club: "Inter", roles: ["ST"], att: 87, def: 55, tec: 82, men: 85, fdTeamId: 108, fdPersonId: null },
  { id: "cur-gyokeres", name: "Viktor Gyökeres", club: "Arsenal", roles: ["ST"], att: 86, def: 52, tec: 78, men: 82, fdTeamId: 57, fdPersonId: null },
  { id: "cur-kvara", name: "Khvicha Kvaratskhelia", club: "Paris SG", roles: ["LW"], att: 86, def: 52, tec: 88, men: 82, fdTeamId: 524, fdPersonId: null },
  { id: "cur-raphinha", name: "Raphinha", club: "Barcelona", roles: ["LW", "RW"], att: 86, def: 55, tec: 85, men: 83, fdTeamId: 81, fdPersonId: null },
];
