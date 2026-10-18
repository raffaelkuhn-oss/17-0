/** Self-hosted Inter: no Google Fonts request anywhere, one small preloaded woff2, metric-matched fallback. */
import { readFileSync, readdirSync, statSync } from "node:fs";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(`${d}/${f}`).isDirectory() ? walk(`${d}/${f}`) : [`${d}/${f}`]));
const src = walk("src").filter((f) => /\.(tsx?|css)$/.test(f));
t("no fonts.googleapis.com / fonts.gstatic.com in src", !src.some((f) => /fonts\.(googleapis|gstatic)\.com/.test(readFileSync(f, "utf8"))));
const size = statSync("src/assets/fonts/inter-latin-var.woff2").size;
t(`one Inter woff2 under 60 KB (${size} B)`, size > 10_000 && size < 60_000);
t("OFL licence ships with the font", readFileSync("src/assets/fonts/Inter-OFL.txt", "utf8").includes("SIL Open Font License"));
const css = readFileSync("src/styles.css", "utf8");
t("@font-face Inter points at the woff2, weights 400-900, swap", /font-family: "Inter";[\s\S]*?font-weight: 400 900;[\s\S]*?font-display: swap;[\s\S]*?inter-latin-var\.woff2/.test(css));
t("metric-matched fallback face", /font-family: "Inter Fallback";[\s\S]*?size-adjust:[\s\S]*?ascent-override:[\s\S]*?descent-override:/.test(css));
t("font stacks use the fallback", (css.match(/"Inter", "Inter Fallback"/g) ?? []).length >= 2);
const root = readFileSync("src/routes/__root.tsx", "utf8");
t("woff2 is preloaded (as=font, crossorigin)", /rel: "preload", href: interWoff2, as: "font", type: "font\/woff2", crossOrigin: "anonymous"/.test(root));
process.exit(fails ? 1 : 0);
