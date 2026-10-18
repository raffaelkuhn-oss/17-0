/**
 * Record labels (copy-final.md #3, Marketing 18 Oct 2026).
 * - recordWDL: always "{W}W {D}D {L}L", no zeros dropped, e.g. "11W 0D 1L" (share text, titles).
 * - recordHeadline: the big record on result screens; a perfect run keeps the brand label "17-0".
 * - recordLabel: compact "7-2-3" / "17-0". Kept ONLY for the compact Daily board. The og PNG and the
 *   canvas share image use recordHeadline (og atlas "record" style has digits, "-", W, D, L and space).
 */
type WDL = { won: number; drawn: number; lost: number };

export function recordLabel(c: WDL): string {
  if (c.drawn === 0 && c.lost === 0) return `${c.won}-0`;
  return `${c.won}-${c.drawn}-${c.lost}`;
}

export function recordWDL(c: WDL): string {
  return `${c.won}W ${c.drawn}D ${c.lost}L`;
}

export function recordHeadline(c: WDL): string {
  return c.drawn === 0 && c.lost === 0 ? recordLabel(c) : recordWDL(c);
}

/** "11 won · 0 drawn · 1 lost" (line 1 under the big record). */
export function recordWords(c: WDL): string {
  return `${c.won} won · ${c.drawn} drawn · ${c.lost} lost`;
}

/**
 * "24 pts in the league phase" ("1 pt" when 1), line 2 under the big record, on its own line so the
 * "·" never dangles at a wrap. Null unless the run reached the end of the league phase (8 matches).
 */
export function pointsLine(c: { points: number; results: { round: string }[] }): string | null {
  const league = c.results.filter((m) => m.round.startsWith("League Phase")).length;
  if (league < 8) return null;
  return `${c.points} ${c.points === 1 ? "pt" : "pts"} in the league phase`;
}

/** Long form for captions and accessible text, e.g. "7W-2D-3L". */
export function recordLong(c: WDL): string {
  return `${c.won}W-${c.drawn}D-${c.lost}L`;
}
