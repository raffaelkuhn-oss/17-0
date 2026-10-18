export type Position = "GK" | "DEF" | "MID" | "FWD";

/** Specific pitch role — used to make the draft positionally honest. */
export type Role = "GK" | "RB" | "CB" | "LB" | "DM" | "CM" | "AM" | "RW" | "ST" | "LW";

export const ROLE_GROUP: Record<Role, Position> = {
  GK: "GK",
  RB: "DEF",
  CB: "DEF",
  LB: "DEF",
  DM: "MID",
  CM: "MID",
  AM: "MID",
  RW: "FWD",
  ST: "FWD",
  LW: "FWD",
};

export const ROLE_LABEL: Record<Role, string> = {
  GK: "Goalkeeper",
  RB: "Right Back",
  CB: "Centre Back",
  LB: "Left Back",
  DM: "Defensive Mid",
  CM: "Central Mid",
  AM: "Attacking Mid",
  RW: "Right Wing",
  ST: "Striker",
  LW: "Left Wing",
};

export type Player = {
  id: string;
  name: string;
  /** Roles the player can genuinely fill. First entry is their natural role. */
  roles: Role[];
  club: string;
  era: string;
  /** 60-99 */
  att: number;
  def: number;
  tec: number;
  /** big-game mentality */
  men: number;
  /** Present only for flagged current players (live form feature). Legends never set it. */
  live?: { form: number; base: number; /** Share-card short name, computed on the server with the legends. */ short?: string };
};

export const PLAYERS: Player[] = [
  // ---------------- Goalkeepers ----------------
  { id: "gk1", name: "Iker Casillas", roles: ["GK"], club: "Real Madrid", era: "2000s", att: 60, def: 94, tec: 84, men: 96 },
  { id: "gk2", name: "Gianluigi Buffon", roles: ["GK"], club: "Juventus", era: "2000s", att: 60, def: 95, tec: 82, men: 92 },
  { id: "gk4", name: "Edwin van der Sar", roles: ["GK"], club: "Man United", era: "2000s", att: 60, def: 90, tec: 83, men: 89 },
  { id: "gk5", name: "Peter Schmeichel", roles: ["GK"], club: "Man United", era: "1990s", att: 62, def: 92, tec: 78, men: 93 },
  { id: "gk7", name: "Oliver Kahn", roles: ["GK"], club: "Bayern München", era: "2000s", att: 61, def: 92, tec: 76, men: 94 },
  { id: "gk8", name: "Keylor Navas", roles: ["GK"], club: "Real Madrid", era: "2010s", att: 60, def: 88, tec: 80, men: 92 },
  { id: "gk9", name: "Dida", roles: ["GK"], club: "AC Milan", era: "2000s", att: 60, def: 89, tec: 76, men: 90 },
  { id: "gk10", name: "Petr Čech", roles: ["GK"], club: "Chelsea", era: "2010s", att: 60, def: 92, tec: 80, men: 91 },
  { id: "gk11", name: "Jens Lehmann", roles: ["GK"], club: "Arsenal", era: "2000s", att: 60, def: 87, tec: 78, men: 88 },
  { id: "gk12", name: "Víctor Valdés", roles: ["GK"], club: "Barcelona", era: "2010s", att: 60, def: 87, tec: 86, men: 88 },
  { id: "gk15", name: "Lev Yashin", roles: ["GK"], club: "Dynamo Moscow", era: "1960s", att: 60, def: 93, tec: 78, men: 94 },

  { id: "gk-barthez", name: "Fabien Barthez", roles: ["GK"], club: "Marseille", era: "1990s", att: 62, def: 88, tec: 80, men: 86 },
  { id: "gk-canizares", name: "Santiago Cañizares", roles: ["GK"], club: "Valencia", era: "2000s", att: 58, def: 88, tec: 76, men: 86 },
  { id: "gk-dudek", name: "Jerzy Dudek", roles: ["GK"], club: "Liverpool", era: "2000s", att: 58, def: 85, tec: 74, men: 90 },
  { id: "gk-toldo", name: "Francesco Toldo", roles: ["GK"], club: "Internazionale", era: "2000s", att: 58, def: 88, tec: 74, men: 86 },
  // ---------------- Right Backs ----------------
  { id: "rb1", name: "Cafu", roles: ["RB"], club: "AC Milan", era: "2000s", att: 80, def: 85, tec: 84, men: 88 },
  { id: "rb2", name: "Dani Alves", roles: ["RB"], club: "Barcelona", era: "2010s", att: 86, def: 80, tec: 89, men: 88 },
  { id: "rb3", name: "Philipp Lahm", roles: ["RB", "LB", "DM"], club: "Bayern München", era: "2010s", att: 76, def: 89, tec: 90, men: 90 },
  { id: "rb5", name: "Javier Zanetti", roles: ["RB", "CM"], club: "Internazionale", era: "2000s", att: 76, def: 88, tec: 84, men: 93 },
  { id: "rb6", name: "Lilian Thuram", roles: ["RB", "CB"], club: "Juventus", era: "2000s", att: 66, def: 91, tec: 80, men: 88 },
  { id: "rb7", name: "Gary Neville", roles: ["RB"], club: "Man United", era: "2000s", att: 70, def: 86, tec: 78, men: 89 },
  { id: "rb8", name: "Maicon", roles: ["RB"], club: "Internazionale", era: "2010s", att: 84, def: 83, tec: 84, men: 88 },
  { id: "rb9", name: "Carles Puyol", roles: ["CB", "RB"], club: "Barcelona", era: "2000s", att: 66, def: 92, tec: 78, men: 94 },
  { id: "rb11", name: "Sergi Roberto", roles: ["RB", "CM"], club: "Barcelona", era: "2010s", att: 76, def: 76, tec: 84, men: 86 },
  { id: "rb12", name: "Kyle Walker", roles: ["RB"], club: "Man City", era: "2020s", att: 80, def: 82, tec: 78, men: 87 },

  { id: "rb-lichtsteiner", name: "Stephan Lichtsteiner", roles: ["RB"], club: "Juventus", era: "2010s", att: 78, def: 83, tec: 80, men: 88 },
  { id: "rb-salgado", name: "Míchel Salgado", roles: ["RB"], club: "Real Madrid", era: "2000s", att: 74, def: 84, tec: 78, men: 86 },
  // ---------------- Centre Backs ----------------
  { id: "cb1", name: "Paolo Maldini", roles: ["CB", "LB"], club: "AC Milan", era: "1990s", att: 70, def: 97, tec: 88, men: 95 },
  { id: "cb2", name: "Franco Baresi", roles: ["CB"], club: "AC Milan", era: "1990s", att: 64, def: 96, tec: 85, men: 93 },
  { id: "cb3", name: "Sergio Ramos", roles: ["CB"], club: "Real Madrid", era: "2010s", att: 78, def: 91, tec: 80, men: 97 },
  { id: "cb4", name: "Alessandro Nesta", roles: ["CB"], club: "AC Milan", era: "2000s", att: 60, def: 94, tec: 84, men: 90 },
  { id: "cb5", name: "Fabio Cannavaro", roles: ["CB"], club: "Juventus", era: "2000s", att: 62, def: 93, tec: 82, men: 91 },
  { id: "cb7", name: "Rio Ferdinand", roles: ["CB"], club: "Man United", era: "2000s", att: 62, def: 91, tec: 83, men: 89 },
  { id: "cb8", name: "Jaap Stam", roles: ["CB"], club: "Man United", era: "1990s", att: 62, def: 92, tec: 76, men: 90 },
  { id: "cb9", name: "Nemanja Vidić", roles: ["CB"], club: "Man United", era: "2010s", att: 66, def: 92, tec: 72, men: 92 },
  { id: "cb10", name: "Ronald Koeman", roles: ["CB"], club: "Barcelona", era: "1990s", att: 78, def: 86, tec: 88, men: 90 },
  { id: "cb11", name: "Franz Beckenbauer", roles: ["CB", "DM"], club: "Bayern München", era: "1970s", att: 78, def: 94, tec: 92, men: 96 },
  { id: "cb12", name: "Matthias Sammer", roles: ["CB", "DM"], club: "Borussia Dortmund", era: "1990s", att: 74, def: 90, tec: 86, men: 92 },
  { id: "cb13", name: "Thiago Silva", roles: ["CB"], club: "Paris Saint-Germain", era: "2010s", att: 64, def: 92, tec: 84, men: 89 },
  { id: "cb14", name: "Gerard Piqué", roles: ["CB"], club: "Barcelona", era: "2010s", att: 70, def: 89, tec: 86, men: 90 },
  { id: "cb17", name: "Laurent Blanc", roles: ["CB"], club: "Man United", era: "1990s", att: 68, def: 88, tec: 84, men: 87 },
  { id: "cb18", name: "Ricardo Carvalho", roles: ["CB"], club: "Chelsea", era: "2000s", att: 60, def: 90, tec: 81, men: 89 },
  { id: "cb19", name: "John Terry", roles: ["CB"], club: "Chelsea", era: "2010s", att: 68, def: 90, tec: 76, men: 92 },
  { id: "cb20", name: "Lúcio", roles: ["CB"], club: "Internazionale", era: "2010s", att: 72, def: 89, tec: 78, men: 89 },
  { id: "cb21", name: "Raphaël Varane", roles: ["CB"], club: "Real Madrid", era: "2010s", att: 62, def: 90, tec: 80, men: 91 },

  { id: "cb-chiellini", name: "Giorgio Chiellini", roles: ["CB", "LB"], club: "Juventus", era: "2010s", att: 58, def: 92, tec: 78, men: 93 },
  { id: "cb-carragher", name: "Jamie Carragher", roles: ["CB"], club: "Liverpool", era: "2000s", att: 55, def: 88, tec: 74, men: 92 },
  { id: "cb-desailly", name: "Marcel Desailly", roles: ["CB", "DM"], club: "AC Milan", era: "1990s", att: 64, def: 91, tec: 80, men: 90 },
  // ---------------- Left Backs ----------------
  { id: "lb1", name: "Roberto Carlos", roles: ["LB"], club: "Real Madrid", era: "2000s", att: 85, def: 82, tec: 88, men: 89 },
  { id: "lb2", name: "Marcelo", roles: ["LB"], club: "Real Madrid", era: "2010s", att: 86, def: 74, tec: 92, men: 90 },
  { id: "lb3", name: "Ashley Cole", roles: ["LB"], club: "Chelsea", era: "2010s", att: 78, def: 88, tec: 82, men: 89 },
  { id: "lb4", name: "Nilton Santos", roles: ["LB"], club: "Botafogo", era: "1960s", att: 78, def: 88, tec: 86, men: 90 },
  { id: "lb5", name: "Andrew Robertson", roles: ["LB"], club: "Liverpool", era: "2020s", att: 80, def: 80, tec: 84, men: 87 },
  { id: "lb6", name: "Bixente Lizarazu", roles: ["LB"], club: "Bayern München", era: "2000s", att: 76, def: 85, tec: 82, men: 88 },
  { id: "lb7", name: "Jordi Alba", roles: ["LB"], club: "Barcelona", era: "2010s", att: 82, def: 76, tec: 85, men: 88 },
  { id: "lb8", name: "Aleksandar Kolarov", roles: ["LB"], club: "AS Roma", era: "2010s", att: 78, def: 80, tec: 84, men: 84 },
  { id: "lb9", name: "David Alaba", roles: ["LB", "CB"], club: "Bayern München", era: "2010s", att: 80, def: 86, tec: 88, men: 90 },
  { id: "lb10", name: "Gianluca Zambrotta", roles: ["LB", "RB"], club: "Juventus", era: "2000s", att: 78, def: 84, tec: 82, men: 86 },
  { id: "lb11", name: "Patrice Evra", roles: ["LB"], club: "Man United", era: "2010s", att: 76, def: 84, tec: 80, men: 88 },

  { id: "lb-abidal", name: "Éric Abidal", roles: ["LB", "CB"], club: "Barcelona", era: "2010s", att: 66, def: 86, tec: 80, men: 88 },
  // ---------------- Defensive Mids ----------------
  { id: "dm1", name: "Claude Makélélé", roles: ["DM"], club: "Real Madrid", era: "2000s", att: 62, def: 93, tec: 82, men: 88 },
  { id: "dm2", name: "Sergio Busquets", roles: ["DM"], club: "Barcelona", era: "2010s", att: 68, def: 88, tec: 92, men: 90 },
  { id: "dm3", name: "Frank Rijkaard", roles: ["DM", "CB"], club: "AC Milan", era: "1990s", att: 78, def: 90, tec: 88, men: 92 },
  { id: "dm4", name: "Roy Keane", roles: ["DM", "CM"], club: "Man United", era: "1990s", att: 76, def: 88, tec: 82, men: 96 },
  { id: "dm5", name: "Xabi Alonso", roles: ["DM", "CM"], club: "Liverpool", era: "2010s", att: 76, def: 84, tec: 92, men: 92 },
  { id: "dm6", name: "Patrick Vieira", roles: ["DM", "CM"], club: "Arsenal", era: "2000s", att: 78, def: 88, tec: 84, men: 92 },
  { id: "dm7", name: "Andrea Pirlo", roles: ["DM"], club: "AC Milan", era: "2000s", att: 78, def: 74, tec: 96, men: 92 },
  { id: "dm8", name: "Edgar Davids", roles: ["DM"], club: "Juventus", era: "2000s", att: 72, def: 88, tec: 84, men: 90 },
  { id: "dm9", name: "Casemiro", roles: ["DM"], club: "Real Madrid", era: "2020s", att: 72, def: 90, tec: 80, men: 94 },
  { id: "dm11", name: "Fernando Redondo", roles: ["DM"], club: "Real Madrid", era: "1990s", att: 70, def: 87, tec: 92, men: 91 },
  { id: "dm12", name: "Gennaro Gattuso", roles: ["DM"], club: "AC Milan", era: "2000s", att: 66, def: 88, tec: 74, men: 93 },
  { id: "dm13", name: "Dunga", roles: ["DM"], club: "Fiorentina", era: "1990s", att: 68, def: 86, tec: 78, men: 88 },
  { id: "dm14", name: "Emerson", roles: ["DM"], club: "AS Roma", era: "2000s", att: 72, def: 86, tec: 80, men: 86 },

  { id: "dm-mascherano", name: "Javier Mascherano", roles: ["DM", "CB"], club: "Barcelona", era: "2010s", att: 62, def: 88, tec: 82, men: 90 },
  // ---------------- Central Mids ----------------
  { id: "cm1", name: "Xavi Hernández", roles: ["CM"], club: "Barcelona", era: "2010s", att: 80, def: 74, tec: 97, men: 92 },
  { id: "cm2", name: "Andrés Iniesta", roles: ["CM", "AM"], club: "Barcelona", era: "2010s", att: 85, def: 70, tec: 97, men: 95 },
  { id: "cm3", name: "Luka Modrić", roles: ["CM"], club: "Real Madrid", era: "2020s", att: 83, def: 74, tec: 95, men: 96 },
  { id: "cm4", name: "Toni Kroos", roles: ["CM"], club: "Real Madrid", era: "2020s", att: 80, def: 74, tec: 95, men: 93 },
  { id: "cm5", name: "Steven Gerrard", roles: ["CM"], club: "Liverpool", era: "2000s", att: 86, def: 80, tec: 88, men: 96 },
  { id: "cm6", name: "Paul Scholes", roles: ["CM"], club: "Man United", era: "2000s", att: 84, def: 74, tec: 92, men: 90 },
  { id: "cm7", name: "Clarence Seedorf", roles: ["CM"], club: "AC Milan", era: "2000s", att: 84, def: 76, tec: 90, men: 94 },
  { id: "cm8", name: "Frank Lampard", roles: ["CM"], club: "Chelsea", era: "2010s", att: 88, def: 72, tec: 86, men: 91 },
  { id: "cm9", name: "Michael Ballack", roles: ["CM"], club: "Bayern München", era: "2000s", att: 85, def: 78, tec: 85, men: 88 },
  { id: "cm10", name: "Bastian Schweinsteiger", roles: ["CM", "DM"], club: "Bayern München", era: "2010s", att: 80, def: 82, tec: 88, men: 93 },
  { id: "cm11", name: "Luís Figo", roles: ["RW", "CM"], club: "Real Madrid", era: "2000s", att: 88, def: 62, tec: 94, men: 90 },
  { id: "cm12", name: "Michael Essien", roles: ["CM", "DM"], club: "Chelsea", era: "2000s", att: 80, def: 86, tec: 82, men: 88 },
  { id: "cm14", name: "Yaya Touré", roles: ["CM"], club: "Barcelona", era: "2010s", att: 84, def: 80, tec: 86, men: 88 },
  { id: "cm15", name: "Arturo Vidal", roles: ["CM"], club: "Juventus", era: "2010s", att: 82, def: 82, tec: 82, men: 91 },
  { id: "cm18", name: "Paul Pogba", roles: ["CM"], club: "Juventus", era: "2010s", att: 84, def: 74, tec: 90, men: 84 },

  { id: "cm-marchisio", name: "Claudio Marchisio", roles: ["CM"], club: "Juventus", era: "2010s", att: 78, def: 78, tec: 85, men: 86 },
  { id: "cm-fabregas", name: "Cesc Fàbregas", roles: ["CM", "AM"], club: "Arsenal", era: "2010s", att: 82, def: 66, tec: 92, men: 86 },
  { id: "cm-mendieta", name: "Gaizka Mendieta", roles: ["CM"], club: "Valencia", era: "2000s", att: 82, def: 70, tec: 86, men: 86 },
  // ---------------- Attacking Mids ----------------
  { id: "am1", name: "Zinedine Zidane", roles: ["AM"], club: "Real Madrid", era: "2000s", att: 88, def: 66, tec: 98, men: 95 },
  { id: "am3", name: "Rui Costa", roles: ["AM"], club: "AC Milan", era: "2000s", att: 82, def: 62, tec: 92, men: 85 },
  { id: "am4", name: "Deco", roles: ["AM"], club: "Porto", era: "2000s", att: 82, def: 70, tec: 91, men: 92 },
  { id: "am5", name: "Kaká", roles: ["AM"], club: "AC Milan", era: "2000s", att: 92, def: 58, tec: 94, men: 92 },
  { id: "am6", name: "Mesut Özil", roles: ["AM"], club: "Real Madrid", era: "2010s", att: 82, def: 58, tec: 93, men: 84 },
  { id: "am7", name: "Michel Platini", roles: ["AM"], club: "Juventus", era: "1980s", att: 90, def: 62, tec: 95, men: 94 },
  { id: "am8", name: "Zico", roles: ["AM"], club: "Flamengo", era: "1980s", att: 90, def: 56, tec: 95, men: 90 },
  { id: "am9", name: "Francesco Totti", roles: ["AM", "ST"], club: "AS Roma", era: "2000s", att: 89, def: 58, tec: 94, men: 89 },
  { id: "am10", name: "Wesley Sneijder", roles: ["AM"], club: "Internazionale", era: "2010s", att: 85, def: 64, tec: 90, men: 91 },
  { id: "am11", name: "Thomas Müller", roles: ["AM", "RW"], club: "Bayern München", era: "2010s", att: 86, def: 66, tec: 82, men: 94 },
  { id: "am12", name: "Juan Román Riquelme", roles: ["AM"], club: "Villarreal", era: "2000s", att: 83, def: 55, tec: 94, men: 86 },
  { id: "am13", name: "David Silva", roles: ["AM"], club: "Man City", era: "2010s", att: 84, def: 62, tec: 93, men: 88 },

  { id: "am-rivaldo", name: "Rivaldo", roles: ["AM", "LW"], club: "Barcelona", era: "1990s", att: 92, def: 50, tec: 93, men: 88 },
  { id: "am-nedved", name: "Pavel Nedvěd", roles: ["AM", "LW"], club: "Juventus", era: "2000s", att: 89, def: 66, tec: 90, men: 92 },
  // ---------------- Right Wings ----------------
  { id: "rw1", name: "Cristiano Ronaldo", roles: ["RW", "ST", "LW"], club: "Real Madrid", era: "2010s", att: 98, def: 55, tec: 94, men: 98 },
  { id: "rw2", name: "Lionel Messi", roles: ["RW", "AM"], club: "Barcelona", era: "2010s", att: 98, def: 52, tec: 99, men: 93 },
  { id: "rw3", name: "Arjen Robben", roles: ["RW"], club: "Bayern München", era: "2010s", att: 91, def: 60, tec: 92, men: 91 },
  { id: "rw4", name: "Mohamed Salah", roles: ["RW"], club: "Liverpool", era: "2020s", att: 92, def: 55, tec: 89, men: 86 },
  { id: "rw5", name: "Garrincha", roles: ["RW"], club: "Botafogo", era: "1960s", att: 92, def: 50, tec: 96, men: 90 },
  { id: "rw6", name: "David Beckham", roles: ["RW"], club: "Man United", era: "2000s", att: 84, def: 66, tec: 92, men: 90 },
  { id: "rw7", name: "Ángel Di María", roles: ["RW", "LW"], club: "Real Madrid", era: "2010s", att: 88, def: 62, tec: 90, men: 92 },
  { id: "rw9", name: "Robert Pirès", roles: ["RW", "LW"], club: "Arsenal", era: "2000s", att: 86, def: 58, tec: 90, men: 86 },
  { id: "rw10", name: "Antonio Valencia", roles: ["RW"], club: "Man United", era: "2010s", att: 82, def: 66, tec: 80, men: 84 },
  { id: "rw12", name: "Franck Ribéry", roles: ["LW", "RW"], club: "Bayern München", era: "2010s", att: 89, def: 58, tec: 92, men: 89 },

  { id: "rw-joaquin", name: "Joaquín", roles: ["RW"], club: "Real Betis", era: "2000s", att: 84, def: 52, tec: 86, men: 82 },
  { id: "rw-mcmanaman", name: "Steve McManaman", roles: ["RW", "LW"], club: "Real Madrid", era: "2000s", att: 83, def: 58, tec: 86, men: 85 },
  // ---------------- Strikers ----------------
  { id: "st1", name: "Ronaldo Nazário", roles: ["ST"], club: "Real Madrid", era: "2000s", att: 96, def: 50, tec: 95, men: 88 },
  { id: "st2", name: "Marco van Basten", roles: ["ST"], club: "AC Milan", era: "1990s", att: 95, def: 55, tec: 93, men: 92 },
  { id: "st3", name: "Alfredo Di Stéfano", roles: ["ST", "AM"], club: "Real Madrid", era: "1950s", att: 95, def: 70, tec: 93, men: 96 },
  { id: "st4", name: "Ferenc Puskás", roles: ["ST"], club: "Real Madrid", era: "1960s", att: 96, def: 50, tec: 92, men: 92 },
  { id: "st5", name: "Gerd Müller", roles: ["ST"], club: "Bayern München", era: "1970s", att: 96, def: 45, tec: 80, men: 93 },
  { id: "st6", name: "Robert Lewandowski", roles: ["ST"], club: "Bayern München", era: "2020s", att: 95, def: 55, tec: 88, men: 90 },
  { id: "st8", name: "Karim Benzema", roles: ["ST"], club: "Real Madrid", era: "2020s", att: 92, def: 56, tec: 92, men: 96 },
  { id: "st9", name: "Filippo Inzaghi", roles: ["ST"], club: "AC Milan", era: "2000s", att: 90, def: 45, tec: 78, men: 95 },
  { id: "st10", name: "Andriy Shevchenko", roles: ["ST"], club: "AC Milan", era: "2000s", att: 93, def: 55, tec: 88, men: 92 },
  { id: "st11", name: "Didier Drogba", roles: ["ST"], club: "Chelsea", era: "2010s", att: 92, def: 60, tec: 84, men: 97 },
  { id: "st12", name: "Raúl González", roles: ["ST"], club: "Real Madrid", era: "2000s", att: 90, def: 58, tec: 86, men: 96 },
  { id: "st13", name: "Eusébio", roles: ["ST"], club: "Benfica", era: "1960s", att: 94, def: 52, tec: 90, men: 91 },
  { id: "st14", name: "Ruud van Nistelrooy", roles: ["ST"], club: "Man United", era: "2000s", att: 92, def: 48, tec: 84, men: 92 },
  { id: "st15", name: "Samuel Eto'o", roles: ["ST"], club: "Barcelona", era: "2000s", att: 92, def: 55, tec: 87, men: 93 },
  { id: "st17", name: "Zlatan Ibrahimović", roles: ["ST"], club: "AC Milan", era: "2010s", att: 92, def: 55, tec: 90, men: 88 },
  { id: "st18", name: "George Weah", roles: ["ST"], club: "AC Milan", era: "1990s", att: 92, def: 52, tec: 90, men: 88 },
  { id: "st19", name: "Alessandro Del Piero", roles: ["ST", "AM"], club: "Juventus", era: "2000s", att: 90, def: 52, tec: 92, men: 92 },
  { id: "st20", name: "Sergio Agüero", roles: ["ST"], club: "Man City", era: "2010s", att: 92, def: 48, tec: 89, men: 88 },
  { id: "st22", name: "Roberto Baggio", roles: ["ST", "AM"], club: "Juventus", era: "1990s", att: 91, def: 50, tec: 95, men: 88 },

  { id: "st-rooney", name: "Wayne Rooney", roles: ["ST", "AM"], club: "Man United", era: "2000s", att: 90, def: 62, tec: 87, men: 90 },
  { id: "st-klose", name: "Miroslav Klose", roles: ["ST"], club: "Bayern München", era: "2000s", att: 89, def: 50, tec: 82, men: 90 },
  { id: "st-kluivert", name: "Patrick Kluivert", roles: ["ST"], club: "Ajax", era: "1990s", att: 88, def: 50, tec: 85, men: 86 },
  // ---------------- Left Wings ----------------
  { id: "lw1", name: "Ronaldinho", roles: ["LW", "AM"], club: "Barcelona", era: "2000s", att: 92, def: 52, tec: 97, men: 90 },
  { id: "lw2", name: "Thierry Henry", roles: ["LW", "ST"], club: "Arsenal", era: "2000s", att: 94, def: 55, tec: 92, men: 88 },
  { id: "lw3", name: "Neymar Jr", roles: ["LW"], club: "Barcelona", era: "2010s", att: 92, def: 48, tec: 96, men: 84 },
  { id: "lw5", name: "Johan Cruyff", roles: ["LW", "ST"], club: "Ajax", era: "1970s", att: 93, def: 62, tec: 97, men: 94 },
  { id: "lw6", name: "Ryan Giggs", roles: ["LW"], club: "Man United", era: "2000s", att: 86, def: 68, tec: 90, men: 90 },
  { id: "lw7", name: "Gareth Bale", roles: ["LW", "RW"], club: "Real Madrid", era: "2010s", att: 91, def: 60, tec: 88, men: 93 },
  { id: "lw8", name: "Sadio Mané", roles: ["LW"], club: "Liverpool", era: "2020s", att: 90, def: 58, tec: 87, men: 89 },
  { id: "lw9", name: "Eden Hazard", roles: ["LW"], club: "Chelsea", era: "2010s", att: 89, def: 54, tec: 94, men: 85 },
  { id: "lw10", name: "Marc Overmars", roles: ["LW"], club: "Ajax", era: "1990s", att: 87, def: 56, tec: 88, men: 87 },
  { id: "lw11", name: "Luís Nani", roles: ["LW"], club: "Man United", era: "2010s", att: 85, def: 56, tec: 88, men: 85 },
  { id: "lw-villa", name: "David Villa", roles: ["LW", "ST"], club: "Barcelona", era: "2010s", att: 91, def: 50, tec: 87, men: 88 },
  { id: "lw-duff", name: "Damien Duff", roles: ["LW", "RW"], club: "Chelsea", era: "2000s", att: 84, def: 56, tec: 85, men: 84 },
];

export const FORMATION: { role: Role; label: string }[] = [
  { role: "GK", label: "Goalkeeper" },
  { role: "RB", label: "Right Back" },
  { role: "CB", label: "Centre Back" },
  { role: "CB", label: "Centre Back" },
  { role: "LB", label: "Left Back" },
  { role: "DM", label: "Defensive Mid" },
  { role: "CM", label: "Central Mid" },
  { role: "AM", label: "Attacking Mid" },
  { role: "RW", label: "Right Wing" },
  { role: "ST", label: "Striker" },
  { role: "LW", label: "Left Wing" },
];

/** Primary positional group of a player (from their natural role). */
export function positionOf(p: Player): Position {
  return ROLE_GROUP[p.roles[0]!];
}

export function overall(p: Player) {
  const pos = positionOf(p);
  const w =
    pos === "GK"
      ? p.def * 0.6 + p.tec * 0.2 + p.men * 0.2
      : pos === "DEF"
        ? p.def * 0.5 + p.tec * 0.2 + p.att * 0.15 + p.men * 0.15
        : pos === "MID"
          ? p.tec * 0.4 + p.att * 0.25 + p.def * 0.2 + p.men * 0.15
          : p.att * 0.5 + p.tec * 0.3 + p.men * 0.2;
  return Math.round(w);
}
