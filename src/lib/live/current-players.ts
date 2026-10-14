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
  id: string;
  name: string;
  club: string;
  roles: Role[];
  att: number;
  def: number;
  tec: number;
  men: number;
  fdTeamId: number;
  fdPersonId: number | null;
};

export const CURRENT_PLAYERS: CurrentPlayerDef[] = [
  {
    id: "cur-donnarumma",
    name: "Gianluigi Donnarumma",
    club: "Man City",
    roles: ["GK"],
    att: 60,
    def: 88,
    tec: 76,
    men: 86,
    fdTeamId: 65,
    fdPersonId: 1731,
  },
  {
    id: "cur-kobel",
    name: "Gregor Kobel",
    club: "Dortmund",
    roles: ["GK"],
    att: 60,
    def: 86,
    tec: 80,
    men: 84,
    fdTeamId: 4,
    fdPersonId: 334,
  },
  {
    id: "cur-cubarsi",
    name: "Pau Cubarsí",
    club: "Barcelona",
    roles: ["CB"],
    att: 62,
    def: 85,
    tec: 84,
    men: 82,
    fdTeamId: 81,
    fdPersonId: 217540,
  },
  {
    id: "cur-gvardiol",
    name: "Joško Gvardiol",
    club: "Man City",
    roles: ["CB", "LB"],
    att: 72,
    def: 85,
    tec: 80,
    men: 83,
    fdTeamId: 65,
    fdPersonId: 122266,
  },
  {
    id: "cur-rice",
    name: "Declan Rice",
    club: "Arsenal",
    roles: ["DM", "CM"],
    att: 74,
    def: 84,
    tec: 83,
    men: 85,
    fdTeamId: 57,
    fdPersonId: 8215,
  },
  {
    id: "cur-kimmich",
    name: "Joshua Kimmich",
    club: "Bayern München",
    roles: ["DM", "RB"],
    att: 72,
    def: 82,
    tec: 87,
    men: 86,
    fdTeamId: 5,
    fdPersonId: 359,
  },
  {
    id: "cur-pedri",
    name: "Pedri",
    club: "Barcelona",
    roles: ["CM", "AM"],
    att: 76,
    def: 72,
    tec: 90,
    men: 82,
    fdTeamId: 81,
    fdPersonId: 133860,
  },
  {
    id: "cur-mctominay",
    name: "Scott McTominay",
    club: "Napoli",
    roles: ["CM", "DM"],
    att: 80,
    def: 76,
    tec: 82,
    men: 85,
    fdTeamId: 113,
    fdPersonId: 7905,
  },
  {
    id: "cur-wirtz",
    name: "Florian Wirtz",
    club: "Liverpool",
    roles: ["AM", "LW"],
    att: 84,
    def: 58,
    tec: 89,
    men: 80,
    fdTeamId: 64,
    fdPersonId: 19334,
  },
  {
    id: "cur-odegaard",
    name: "Martin Ødegaard",
    club: "Arsenal",
    roles: ["AM", "CM"],
    att: 82,
    def: 60,
    tec: 89,
    men: 83,
    fdTeamId: 57,
    fdPersonId: 7427,
  },
  {
    id: "cur-guler",
    name: "Arda Güler",
    club: "Real Madrid",
    roles: ["AM", "RW"],
    att: 82,
    def: 55,
    tec: 88,
    men: 80,
    fdTeamId: 86,
    fdPersonId: 169162,
  },
  {
    id: "cur-yamal",
    name: "Lamine Yamal",
    club: "Barcelona",
    roles: ["RW"],
    att: 87,
    def: 50,
    tec: 91,
    men: 82,
    fdTeamId: 81,
    fdPersonId: 202283,
  },
  {
    id: "cur-raphinha",
    name: "Raphinha",
    club: "Barcelona",
    roles: ["LW", "RW"],
    att: 86,
    def: 55,
    tec: 85,
    men: 83,
    fdTeamId: 81,
    fdPersonId: 37428,
  },
  {
    id: "cur-alvarez",
    name: "Julián Álvarez",
    club: "Atlético Madrid",
    roles: ["ST"],
    att: 86,
    def: 58,
    tec: 84,
    men: 84,
    fdTeamId: 78,
    fdPersonId: 98571,
  },
  {
    id: "cur-lautaro",
    name: "Lautaro Martínez",
    club: "Inter",
    roles: ["ST"],
    att: 87,
    def: 55,
    tec: 82,
    men: 85,
    fdTeamId: 108,
    fdPersonId: 3220,
  },
];
