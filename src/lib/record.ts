/**
 * Win-draw-loss label for a campaign, e.g. "7-2-3".
 * A perfect run keeps the brand label "17-0" (it has no draws or losses by definition).
 */
export function recordLabel(c: { won: number; drawn: number; lost: number }): string {
  if (c.drawn === 0 && c.lost === 0) return `${c.won}-0`;
  return `${c.won}-${c.drawn}-${c.lost}`;
}

/** Long form for captions and accessible text, e.g. "7W-2D-3L". */
export function recordLong(c: { won: number; drawn: number; lost: number }): string {
  return `${c.won}W-${c.drawn}D-${c.lost}L`;
}
