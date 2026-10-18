/**
 * Per-run preview image (1200x630 PNG): text and flat shapes only (no photos, crests or
 * competition branding). Composed from a pre-baked glyph atlas (scripts/gen-og-atlas.py) into a
 * palette buffer, so a render is a few ms of plain JS + the platform zlib, no WASM rasteriser.
 * Pure apart from CompressionStream: runs on the Worker and in Bun tests.
 */
import ATLAS from "../../assets/og/atlas.json";
import { FORMATION, overall, type Player } from "../players";
import type { Campaign } from "../sim";
import { recordHeadline } from "../record";
import { encodeIndexedPng } from "./png";

export const OG_W = 1200;
export const OG_H = 630;

type Glyph = [w: number, h: number, ox: number, oy: number, adv: number, off: number];
type Style = keyof typeof ATLAS.styles;
const styles = ATLAS.styles as unknown as Record<Style, { size: number; glyphs: Record<string, Glyph> }>;

const BG = 0x246828, BAND = 0x2a7230, INK = 0xffffff, MUTED = 0xdceedc, CREAM = 0xf6f3e4;
const GOLD = 0xfae3ab, RED = 0xd23c63, DRAW = 0x7fa882, CARD = 0x1d5a22;
const LEVELS = 16;

export function runHeadline(c: Campaign): string {
  if (c.perfect) return "PERFECT 17-0";
  if (c.champion) return "CHAMPIONS";
  if (c.eliminatedIn === "League Phase") return "OUT IN THE LEAGUE PHASE";
  if (c.eliminatedIn === "Final") return "BEATEN IN THE FINAL";
  return `OUT IN THE ${(c.eliminatedIn ?? "").toUpperCase()}`;
}

class Surface {
  px = new Uint8Array(OG_W * OG_H);
  palette: number[] = [];
  private idx = new Map<number, number>();
  private blendCache = new Map<number, number>();
  constructor(private atlas: Uint8Array) {}

  color(rgb: number): number {
    let i = this.idx.get(rgb);
    if (i === undefined) {
      if (this.palette.length >= 256) return this.nearest(rgb);
      i = this.palette.length;
      this.palette.push(rgb);
      this.idx.set(rgb, i);
    }
    return i;
  }
  private nearest(rgb: number): number {
    let best = 0, bd = Infinity;
    this.palette.forEach((c, i) => {
      const d = Math.abs(((c >> 16) & 255) - ((rgb >> 16) & 255)) + Math.abs(((c >> 8) & 255) - ((rgb >> 8) & 255)) + Math.abs((c & 255) - (rgb & 255));
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  rect(x: number, y: number, w: number, h: number, rgb: number, r = 0) {
    const c = this.color(rgb);
    const x0 = Math.max(0, x), x1 = Math.min(OG_W, x + w), y0 = Math.max(0, y), y1 = Math.min(OG_H, y + h);
    for (let yy = y0; yy < y1; yy++) {
      let a = x0, b = x1;
      if (r) {
        const dy = yy < y + r ? y + r - yy - 0.5 : yy >= y + h - r ? yy - (y + h - r) + 0.5 : 0;
        if (dy) {
          const dx = r - Math.sqrt(Math.max(0, r * r - dy * dy));
          a = Math.max(x0, Math.round(x + dx));
          b = Math.min(x1, Math.round(x + w - dx));
        }
      }
      this.px.fill(c, yy * OG_W + a, yy * OG_W + b);
    }
  }

  width(style: Style, s: string): number {
    const g = styles[style].glyphs;
    let w = 0;
    for (const ch of s) w += (g[ch] ?? g["?"] ?? [0, 0, 0, 0, 0, 0])[4];
    return w;
  }

  text(style: Style, s: string, x: number, baseline: number, rgb: number, anchor: "start" | "middle" | "end" = "start", spacing = 0) {
    const g = styles[style].glyphs;
    const total = this.width(style, s) + spacing * Math.max(0, [...s].length - 1);
    let pen = anchor === "start" ? x : anchor === "middle" ? x - total / 2 : x - total;
    const fg = this.color(rgb);
    for (const ch of s) {
      const gl = g[ch] ?? g["?"];
      if (!gl) continue;
      const [w, h, ox, oy, adv, off] = gl;
      const gx = Math.round(pen + ox), gy = Math.round(baseline + oy);
      for (let j = 0; j < h; j++) {
        const yy = gy + j;
        if (yy < 0 || yy >= OG_H) continue;
        const row = off + j * w;
        for (let i = 0; i < w; i++) {
          const a = this.atlas[row + i]!;
          if (a < 8) continue;
          const xx = gx + i;
          if (xx < 0 || xx >= OG_W) continue;
          const p = yy * OG_W + xx;
          this.px[p] = a > 247 ? fg : this.blend(fg, this.px[p]!, Math.round((a / 255) * (LEVELS - 1)));
        }
      }
      pen += adv + spacing;
    }
  }

  private blend(fg: number, bg: number, level: number): number {
    const key = (fg << 12) | (bg << 4) | level;
    let i = this.blendCache.get(key);
    if (i === undefined) {
      const f = this.palette[fg]!, b = this.palette[bg]!, t = level / (LEVELS - 1);
      const mix = (s: number) => Math.round(((f >> s) & 255) * t + ((b >> s) & 255) * (1 - t));
      i = this.color((mix(16) << 16) | (mix(8) << 8) | mix(0));
      this.blendCache.set(key, i);
    }
    return i;
  }
}

/** The XI stamp shown on the preview: tier word + display N (xi-chance.ts, recomputed from the code). */
export type OgStamp = { tier: string; n: string };

/** Renders the run preview. atlas = bytes of src/assets/og/atlas.bin. */
export async function renderRunPng(picks: Player[], c: Campaign, atlas: Uint8Array, stamp?: OgStamp): Promise<Uint8Array> {
  const s = new Surface(atlas);
  s.rect(0, 0, OG_W, OG_H, BG);
  for (let i = 0; i < 6; i++) s.rect(i * 200 + 100, 0, 100, OG_H, BAND);
  const accent = c.perfect ? GOLD : c.champion ? CREAM : RED;
  s.rect(0, 0, OG_W, 10, accent);
  s.text("kicker", runHeadline(c), 64, 84, accent, "start", 5);
  // "11W 0D 1L" (copy-final.md #3); a perfect run keeps "17-0". Atlas "record" has digits, "-", W, D, L, space.
  s.text("record", recordHeadline(c), 60, 200, INK);
  s.text("stats", `${c.won} won · ${c.drawn} drawn · ${c.lost} lost · ${c.points} league pts`, 66, 248, MUTED);
  // The one added line (og v3): tier + the XI's "1 in N", right of the stats line (copy-stamp.md §4).
  if (stamp) s.text("stats", `${stamp.tier} · 17-0 about 1 in ${stamp.n}`, OG_W - 64, 248, GOLD, "end");
  const box = 46, gap = 8, y0 = 282;
  c.results.forEach((m, i) => {
    const x = 64 + i * (box + gap);
    s.rect(x, y0, box, box, m.outcome === "W" ? CREAM : m.outcome === "D" ? DRAW : RED, 9);
    s.text("square", m.outcome, x + box / 2, y0 + 31, m.outcome === "W" ? BG : INK, "middle");
  });
  const colW = 360, rowH = 50, top = 362;
  picks.forEach((p, i) => {
    const col = i < 4 ? 0 : i < 8 ? 1 : 2;
    const row = i < 4 ? i : i < 8 ? i - 4 : i - 8;
    const x = 64 + col * (colW + 16), y = top + row * (rowH + 8);
    s.rect(x, y, colW, rowH, CARD, 10);
    s.text("role", FORMATION[i]?.role ?? "", x + 16, y + 32, MUTED);
    let name = p.name;
    while (s.width("name", name) > colW - 110 && name.length > 4) name = name.slice(0, -2) + "…";
    s.text("name", name, x + 62, y + 33, INK);
    s.text("rating", String(overall(p)), x + colW - 16, y + 33, GOLD, "end");
  });
  s.text("cta", stamp ? `Can your XI beat 1 in ${stamp.n}?` : "Can your XI beat it?", OG_W - 64, 560, MUTED, "end");
  s.text("url", "ucl17-0.com", OG_W - 64, 598, INK, "end");
  return encodeIndexedPng(OG_W, OG_H, s.px, s.palette);
}

/** Sync warm-up of the drawing code (no encode); call once at Worker startup. */
export function warmRenderer(atlas: Uint8Array) {
  const s = new Surface(atlas);
  s.rect(0, 0, 200, 100, BG, 9);
  for (const st of Object.keys(styles) as Style[]) s.text(st, "Wd 0-1", 10, 60, INK);
}
