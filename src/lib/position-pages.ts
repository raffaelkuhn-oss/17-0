import type { Role } from "./players";

/** One SEO page per position pattern: "best champions league [position] of all time". */
export const POSITION_PAGES = {
  goalkeepers: { label: "Goalkeepers", singular: "goalkeeper", roles: ["GK"] },
  "centre-backs": { label: "Centre Backs", singular: "centre back", roles: ["CB"] },
  "full-backs": { label: "Full Backs", singular: "full back", roles: ["RB", "LB"] },
  midfielders: { label: "Midfielders", singular: "midfielder", roles: ["DM", "CM", "AM"] },
  wingers: { label: "Wingers", singular: "winger", roles: ["RW", "LW"] },
  strikers: { label: "Strikers", singular: "striker", roles: ["ST"] },
} satisfies Record<string, { label: string; singular: string; roles: Role[] }>;

export type PositionSlug = keyof typeof POSITION_PAGES;
export const POSITION_SLUGS = Object.keys(POSITION_PAGES) as PositionSlug[];
