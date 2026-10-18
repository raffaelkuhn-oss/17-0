/** Share-card short forms for current (live) players. Server-side only (used by buildLivePlayers),
 * so no live name ships in the client bundle before the live pool launches. */
import { SHORT_NAME_OVERRIDES } from "../short-name";

export const LIVE_SHORT_NAME_OVERRIDES: Record<string, string> = {
  "Vinícius Júnior": "Vinícius",
  "Alisson Becker": "Alisson",
  "Lautaro Martínez": "Lautaro",
  "Trent Alexander-Arnold": "Trent",
};

/** Legend + live overrides, for short names computed over both pools. */
export const ALL_SHORT_NAME_OVERRIDES: Record<string, string> = { ...SHORT_NAME_OVERRIDES, ...LIVE_SHORT_NAME_OVERRIDES };
