// Generates public/og-image.jpg (1200x630): original design, no photos/crests/third-party marks.
// Run: node scripts/gen-og-image.mjs  (needs sharp + Anton/Barlow fonts installed for fontconfig)
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const W = 1200,
  H = 630;
// Site palette (src/styles.css): background, card, primary, accent, foreground
const C = {
  bg: "#0b1328",
  card: "#141d38",
  primary: "#1fc3e6",
  accent: "#e9c84b",
  fg: "#f3f5f9",
  grass1: "#2f8a43",
  grass2: "#2a7d3c",
  line: "#e9f3e6",
};

// Pitch (right side, landscape, attacking upward)
const px = 620,
  py = 40,
  pw = 540,
  ph = 550;
const stripes = Array.from(
  { length: 10 },
  (_, i) =>
    `<rect x="${px}" y="${py + (i * ph) / 10}" width="${pw}" height="${ph / 10}" fill="${i % 2 ? C.grass1 : C.grass2}"/>`,
).join("");
const lines = `
  <rect x="${px + 20}" y="${py + 20}" width="${pw - 40}" height="${ph - 40}" fill="none" stroke="${C.line}" stroke-opacity=".7" stroke-width="3"/>
  <line x1="${px + 20}" y1="${py + ph / 2}" x2="${px + pw - 20}" y2="${py + ph / 2}" stroke="${C.line}" stroke-opacity=".7" stroke-width="3"/>
  <circle cx="${px + pw / 2}" cy="${py + ph / 2}" r="60" fill="none" stroke="${C.line}" stroke-opacity=".7" stroke-width="3"/>
  <rect x="${px + pw / 2 - 110}" y="${py + ph - 20 - 90}" width="220" height="90" fill="none" stroke="${C.line}" stroke-opacity=".7" stroke-width="3"/>
  <rect x="${px + pw / 2 - 110}" y="${py + 20}" width="220" height="90" fill="none" stroke="${C.line}" stroke-opacity=".7" stroke-width="3"/>`;
// 4-3-3 formation, generic position labels only
const F = [
  ["GK", 0.5, 0.88],
  ["LB", 0.14, 0.68],
  ["CB", 0.38, 0.72],
  ["CB", 0.62, 0.72],
  ["RB", 0.86, 0.68],
  ["CM", 0.25, 0.47],
  ["CM", 0.5, 0.52],
  ["CM", 0.75, 0.47],
  ["LW", 0.18, 0.22],
  ["ST", 0.5, 0.17],
  ["RW", 0.82, 0.22],
];
const cw = 64,
  ch = 80;
const cards = F.map(([pos, fx, fy]) => {
  const x = px + fx * pw - cw / 2,
    y = py + fy * ph - ch / 2;
  return `<g><rect x="${x + 3}" y="${y + 4}" width="${cw}" height="${ch}" rx="8" fill="#000" fill-opacity=".25"/>
  <rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="8" fill="${C.card}" stroke="${C.primary}" stroke-width="2.5"/>
  <circle cx="${x + cw / 2}" cy="${y + 30}" r="13" fill="${C.primary}" fill-opacity=".35"/>
  <text x="${x + cw / 2}" y="${y + 68}" text-anchor="middle" font-family="Barlow" font-weight="700" font-size="17" fill="${C.fg}">${pos}</text></g>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="${px - 6}" y="${py - 6}" width="${pw + 12}" height="${ph + 12}" rx="14" fill="${C.line}" fill-opacity=".12"/>
  <clipPath id="p"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="10"/></clipPath>
  <g clip-path="url(#p)">${stripes}${lines}</g>
  ${cards}
  <text x="64" y="120" font-family="Barlow" font-weight="700" font-size="30" letter-spacing="4" fill="${C.primary}">17-0 DRAFT</text>
  <rect x="64" y="160" width="300" height="150" rx="18" fill="${C.accent}"/>
  <text x="214" y="282" text-anchor="middle" font-family="Anton" font-size="132" fill="${C.bg}">17-0</text>
  <text x="64" y="388" font-family="Anton" font-size="50" fill="${C.fg}">DRAFT 11 LEGENDS.</text>
  <text x="64" y="446" font-family="Anton" font-size="50" fill="${C.fg}">WIN ALL 17 MATCHES.</text>
  <text x="64" y="510" font-family="Barlow" font-weight="500" font-size="28" fill="#b9c2d6">Free browser game · no sign-up</text>
  <text x="64" y="572" font-family="Barlow" font-weight="600" font-size="24" fill="${C.primary}">ucl17-0.com</text>
</svg>`;

const out = fileURLToPath(new URL("../public/og-image.jpg", import.meta.url));
await sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
console.log("wrote", out);
