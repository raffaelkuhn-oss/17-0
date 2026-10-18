// Local render benchmark (not in CI): bun scripts/og-bench.ts [sample.png]
import { readFileSync, writeFileSync } from "node:fs";
import { encodeChallenge, replayChallenge } from "../src/lib/challenge";
import { renderRunPng, warmRenderer } from "../src/lib/og/run-image";
import { xiStamp } from "../src/lib/xi-chance";
const atlas = new Uint8Array(readFileSync(new URL("../src/assets/og/atlas.bin", import.meta.url)));
// Same as the Worker: sync warm-up at startup (not counted as request CPU).
const tw = performance.now();
warmRenderer(atlas);
console.log(`startup warm-up ms: ${(performance.now() - tw).toFixed(1)}`);
const times: number[] = [], sizes: number[] = [];
let sample: Uint8Array | null = null, code = "";
for (let i = 0; i < 50; i++) {
  const ch = { mode: "classic" as const, seed: 1000 + i * 7777, picks: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2].map((p) => (p + i) % 4) };
  const run = replayChallenge(ch)!;
  const t0 = performance.now();
  // Timed like the Worker handler: the XI stamp is computed per request, then the render.
  const png = await renderRunPng(run.picks, run.campaign, atlas, xiStamp(run.picks));
  times.push(performance.now() - t0); sizes.push(png.length);
  if (i === 0) { sample = png; code = encodeChallenge(ch); }
}
const s = [...times].sort((a, b) => a - b);
console.log(`render ms (50 runs): first ${times[0]!.toFixed(1)}, median ${s[25]!.toFixed(1)}, p90 ${s[45]!.toFixed(1)}, max ${s[49]!.toFixed(1)}`);
console.log(`png bytes: min ${Math.min(...sizes)}, max ${Math.max(...sizes)}`);
if (process.argv[2] && sample) { writeFileSync(process.argv[2], sample); console.log(`wrote ${process.argv[2]} (code ${code})`); }
