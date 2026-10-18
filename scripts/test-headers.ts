/**
 * Guards public/_headers (Cloudflare Workers static-assets rules): only the content-hashed
 * /assets/* may be cached immutably. HTML, /og-image-v2.jpg (stable URL, may be replaced),
 * icons and /r/<code>/og-v<N>.png must never match a long-cache rule.
 */
import { readFileSync } from "node:fs";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const src = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const rules: { path: string; headers: string[] }[] = [];
for (const line of src.split("\n")) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  if (/^\S/.test(line)) rules.push({ path: line.trim(), headers: [] });
  else rules.at(-1)?.headers.push(line.trim());
}
const toRe = (p: string) => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
const longCache = rules.filter((r) => r.headers.some((h) => /^cache-control:.*(immutable|max-age=[1-9])/i.test(h)));
t("exactly one long-cache rule", longCache.length === 1);
t("long-cache rule is /assets/*", longCache[0]?.path === "/assets/*");
t("rule is public, 1 year, immutable", !!longCache[0]?.headers.some((h) => /^cache-control:\s*public,\s*max-age=31536000,\s*immutable$/i.test(h)));
const mustNotMatch = ["/", "/draft", "/daily", "/r/djJ8Y3xyc3wwMTIzMDEyMzAxMg", "/r/djJ8Y3xyc3wwMTIzMDEyMzAxMg/og-v1.png",
  "/og-image-v2.jpg", "/og-image.jpg", "/logo-64.png", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/site.webmanifest", "/social/instagram-1080.png"];
for (const p of mustNotMatch) t(`no long-cache rule matches ${p}`, !longCache.some((r) => toRe(r.path).test(p)));
t("hashed asset matches", longCache.some((r) => toRe(r.path).test("/assets/index-uTV63F3J.js")));
process.exit(fails ? 1 : 0);
