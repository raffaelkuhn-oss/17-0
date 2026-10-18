import { SITE_HOST } from "@/lib/site";
import { FORMATION, overall, type Player } from "./players";
import type { Campaign } from "./sim";
import { recordHeadline, recordWords } from "@/lib/record";

export type ShareCardData = {
  picks: Player[];
  campaign: Campaign;
  rating: number;
  /** Optional line shown under the headline, e.g. "Daily Challenge · 11 Aug". */
  context?: string | undefined;
};

const W = 1200;
const H = 630;

const INK = "#ffffff";
const MUTED = "#dceedc";
const LINE = "#ebf5eb";
const GOLD = "#fae3ab";
const RED = "#d23c63";
const GREEN = "#ebf5eb";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function headline(campaign: Campaign) {
  if (campaign.perfect) return "PERFECT 17-0";
  if (campaign.champion) return "CHAMPIONS OF EUROPE";
  if (campaign.eliminatedIn === "League Phase") return "OUT IN THE LEAGUE PHASE";
  if (campaign.eliminatedIn === "Final") return "BEATEN IN THE FINAL";
  return `OUT IN THE ${(campaign.eliminatedIn ?? "").toUpperCase()}`;
}

/** Renders the result as a 1200x630 PNG blob, ready to post to X / Instagram. */
export async function renderShareImage(data: ShareCardData): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { picks, campaign, rating, context } = data;
  const accent = campaign.perfect ? GOLD : campaign.champion ? LINE : RED;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2e7d32");
  bg.addColorStop(0.55, "#2a7330");
  bg.addColorStop(1, "#246828");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent glow
  const glow = ctx.createRadialGradient(180, 120, 20, 180, 120, 520);
  glow.addColorStop(0, `${accent}33`);
  glow.addColorStop(1, "#00000000");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Accent bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 8);

  // Kicker
  ctx.fillStyle = accent;
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText(headline(campaign), 64, 92);
  ctx.letterSpacing = "0px";

  // Score: "11W 0D 1L" (copy-final.md #3); a perfect run keeps "17-0". The side text uses the same words
  // as the Worker og image. The score shrinks only if score + side text would run past the right margin.
  const score = recordHeadline(campaign);
  const side = `${recordWords(campaign)} · ${campaign.points} league pts`;
  ctx.font = "500 22px system-ui, sans-serif";
  let sideWidth = ctx.measureText(side).width;
  if (context) {
    ctx.font = "600 20px system-ui, sans-serif";
    sideWidth = Math.max(sideWidth, ctx.measureText(context).width);
  }
  ctx.font = "800 132px system-ui, sans-serif";
  const room = W - 64 - 68 - 24 - sideWidth;
  const natural = ctx.measureText(score).width;
  const scorePx = natural > room ? Math.max(84, Math.floor((132 * room) / natural)) : 132;
  ctx.font = `800 ${scorePx}px system-ui, sans-serif`;
  ctx.fillStyle = INK;
  ctx.fillText(score, 60, 218);

  const scoreWidth = ctx.measureText(score).width;
  ctx.fillStyle = MUTED;
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText(side, 68 + scoreWidth + 24, 206);

  if (context) {
    ctx.fillStyle = accent;
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(context, 68 + scoreWidth + 24, 172);
  }

  // Squad grid
  const colX = [64, 452, 840];
  const startY = 288;
  const rowH = 44;
  ctx.font = "500 21px system-ui, sans-serif";

  picks.forEach((p, i) => {
    const col = Math.floor(i / 4);
    const row = i % 4;
    const x = colX[Math.min(col, 2)]!;
    const y = startY + row * rowH;

    ctx.fillStyle = "#ffffff10";
    roundRect(ctx, x, y - 26, 348, 36, 10);
    ctx.fill();

    ctx.fillStyle = MUTED;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(FORMATION[i]?.role ?? "", x + 14, y - 2);

    ctx.fillStyle = INK;
    ctx.font = "500 20px system-ui, sans-serif";
    ctx.fillText(p.name, x + 62, y - 1);

    ctx.fillStyle = accent;
    ctx.font = "700 19px system-ui, sans-serif";
    const ov = String(overall(p));
    ctx.fillText(ov, x + 348 - 16 - ctx.measureText(ov).width, y - 1);
  });

  // Match strip
  const stripY = H - 118;
  const box = 26;
  const gap = 7;
  campaign.results.forEach((m, i) => {
    const x = 64 + i * (box + gap);
    ctx.fillStyle = m.outcome === "W" ? GREEN : m.outcome === "D" ? "#ffffff28" : RED;
    roundRect(ctx, x, stripY, box, box, 7);
    ctx.fill();
    ctx.fillStyle = m.outcome === "W" ? "#1b3a20" : INK;
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillText(m.outcome, x + 8, stripY + 18);
  });

  // Footer
  ctx.fillStyle = MUTED;
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText(`Squad rating ${rating}`, 64, H - 44);

  ctx.fillStyle = INK;
  ctx.font = "700 26px system-ui, sans-serif";
  const url = SITE_HOST;
  ctx.fillText(url, W - 64 - ctx.measureText(url).width, H - 42);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
}
