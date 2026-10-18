import { SITE_HOST } from "@/lib/site";
import { FORMATION, type Player } from "./players";
import type { Campaign } from "./sim";
import { recordHeadline } from "@/lib/record";
import { xiDare, type XiStamp } from "./xi-chance";
import { shortName } from "./short-name";

export type ShareCardData = {
  picks: Player[];
  campaign: Campaign;
  /** The XI's "1 in N" stamp (xi-chance.ts), computed on the device. */
  stamp: XiStamp;
  /** Optional label in the footer line, e.g. "Daily Challenge · 18 Oct". */
  context?: string | undefined;
};

/** Layout: Marketing's mock A (/workspace/aha/mocks/A-xi-chance-stamp-1200x630.png). Text and flat shapes only. */
const W = 1200;
const H = 630;
const PANEL_W = 470;

const G1 = "#2e7d32";
const G2 = "#388e3c";
const PANEL = "#246828";
const SHADOW = "#1e5a22";
const LINE = "#ebf5eb";
const WHITE = "#ffffff";
const MUTED = "#dceedc";
const CREAM = "#faf7eb";
const INK = "#1b3a20";
const GREEN_T = "#388e3c";
const GOLD = "#fae3ab";
const RED = "#d23c63";
const DRAW = "#7fa882";
/** Pitch card width and name size (names shrink only if a display name is wider than CARD_W - 12). */
export const CARD_W = 136;
export const NAME_PX = 17;
const NAME_MIN_PX = 12;
export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Card positions on a horizontal pitch (goal on the left), in FORMATION order (GK, RB, CB, CB, LB, DM, CM, AM, RW, ST, LW). */
const SPOTS: [number, number][] = [
  [0.07, 0.5], [0.27, 0.13], [0.22, 0.38], [0.22, 0.62], [0.27, 0.87],
  [0.45, 0.5], [0.5, 0.25], [0.5, 0.75], [0.78, 0.15], [0.85, 0.5], [0.78, 0.85],
];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Largest font size (down to min) at which text fits maxW; caller sets the weight. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, min: number, maxW: number): number {
  let s = size;
  for (; s > min; s--) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) return s;
  }
  ctx.font = `${weight} ${min}px ${FONT}`;
  return min;
}

function pitch(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const n = 10;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? G2 : G1;
    ctx.fillRect(x0 + ((x1 - x0) * i) / n, y0, (x1 - x0) / n + 1, y1 - y0);
  }
  const a = x0 + 20, b = y0 + 20, c = x1 - 20, d = y1 - 20;
  const mx = (a + c) / 2, my = (b + d) / 2, h = d - b, L = c - a;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.strokeRect(a, b, c - a, d - b);
  ctx.beginPath();
  ctx.moveTo(mx, b);
  ctx.lineTo(mx, d);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(mx, my, h * 0.15, 0, Math.PI * 2);
  ctx.stroke();
  const bw = L * 0.15, bh = h * 0.58, sw = L * 0.055, sh = h * 0.28;
  ctx.strokeRect(a, my - bh / 2, bw, bh);
  ctx.strokeRect(a, my - sh / 2, sw, sh);
  ctx.strokeRect(c - bw, my - bh / 2, bw, bh);
  ctx.strokeRect(c - sw, my - sh / 2, sw, sh);
}

/** Renders the result card (1200x630 JPEG) on the device: record, match squares, the XI stamp and the XI on a pitch. */
export async function renderShareImage(data: ShareCardData): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { picks, campaign, stamp, context } = data;

  // Right: the XI on a pitch
  pitch(ctx, PANEL_W, 0, W, H);
  const pw = W - PANEL_W - 40, ph = H - 40;
  picks.forEach((p, i) => {
    const [fx, fy] = SPOTS[i] ?? [0.5, 0.5];
    const cx = PANEL_W + 20 + fx * pw, cy = 20 + fy * ph;
    const cw = CARD_W, ch = 56;
    const name = shortName(p); // mock A short forms; full name where the short one is ambiguous
    ctx.fillStyle = SHADOW;
    roundRect(ctx, cx - cw / 2 + 3, cy - ch / 2 + 4, cw, ch, 10);
    ctx.fill();
    ctx.fillStyle = CREAM;
    roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 10);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = GREEN_T;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText(FORMATION[i]?.role ?? "", cx, cy - 7);
    ctx.fillStyle = INK;
    fit(ctx, name, 800, NAME_PX, NAME_MIN_PX, cw - 12);
    ctx.fillText(name, cx, cy + 16, cw - 10);
  });
  ctx.textAlign = "left";

  // Left panel
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, PANEL_W, H);
  ctx.fillStyle = WHITE;
  ctx.font = `900 34px ${FONT}`;
  ctx.fillText("17-0", 44, 74);
  const wm = ctx.measureText("17-0 ").width;
  ctx.font = `500 34px ${FONT}`;
  ctx.fillText("Draft", 44 + wm, 74);
  // Tier pill beside the wordmark (copy-stamp.md §1: the tier word goes in a small pill)
  ctx.font = `800 17px ${FONT}`;
  const pillW = ctx.measureText(stamp.tier).width + 28;
  ctx.fillStyle = GOLD;
  roundRect(ctx, 430 - pillW, 48, pillW, 34, 17);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.fillText(stamp.tier, 430 - pillW / 2, 71);
  ctx.textAlign = "left";

  ctx.fillStyle = WHITE;
  fit(ctx, recordHeadline(campaign), 900, 78, 48, 386);
  ctx.fillText(recordHeadline(campaign), 44, 150);
  ctx.fillStyle = MUTED;
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText(`${campaign.won} won · ${campaign.drawn} drawn · ${campaign.lost} lost · ${campaign.points} league pts`, 44, 184, 386);

  // Match squares: one per match, empty outlines up to 17
  const s = 20, g = 3;
  for (let i = 0; i < 17; i++) {
    const m = campaign.results[i];
    const x = 44 + i * (s + g);
    roundRect(ctx, x, 202, s, s, 4);
    if (m) {
      ctx.fillStyle = m.outcome === "W" ? CREAM : m.outcome === "D" ? DRAW : RED;
      ctx.fill();
    } else {
      ctx.strokeStyle = MUTED;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // The stamp (copy-stamp.md §2)
  ctx.fillStyle = CREAM;
  roundRect(ctx, 44, 250, 386, 214, 22);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = GREEN_T;
  ctx.font = `800 20px ${FONT}`;
  ctx.fillText("THIS XI GOES 17-0", 237, 290);
  ctx.fillStyle = INK;
  const big = `1 in ${stamp.n}`;
  fit(ctx, big, 900, 84, 40, 356);
  ctx.fillText(big, 237, 378);
  ctx.fillStyle = GREEN_T;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText("seasons, in our sims", 237, 418);
  ctx.fillStyle = INK;
  ctx.font = `600 18px ${FONT}`;
  ctx.fillText(`title chance ${stamp.titlePct}%`, 237, 446);
  ctx.textAlign = "left";

  ctx.fillStyle = WHITE;
  const dare = xiDare(stamp);
  fit(ctx, dare, 800, 26, 16, 386);
  ctx.fillText(dare, 44, 520);
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(SITE_HOST, 44, 562);
  ctx.fillStyle = MUTED;
  const foot = `${context ? `${context} · ` : ""}Fan-made · not affiliated with UEFA`;
  fit(ctx, foot, 500, 15, 11, 386);
  ctx.fillText(foot, 44, 600);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88));
}

/** One render per finished run, shared by the Share button (file share) and the preview card. */
const cache = new WeakMap<Campaign, Promise<Blob | null>>();
export function shareImageFor(data: ShareCardData): Promise<Blob | null> {
  let p = cache.get(data.campaign);
  if (!p) {
    p = renderShareImage(data);
    cache.set(data.campaign, p);
  }
  return p;
}
