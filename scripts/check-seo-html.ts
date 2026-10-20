/**
 * Build-output SEO check (CI, after `bun run build`): renders every sitemap URL through the built
 * Worker (dist/server/index.js) and checks the served <head> and footer. PM brief 20 Oct.
 * - home + default meta: <title>, og:title, twitter:title are exactly HOME_TITLE; the three
 *   descriptions are HOME_DESCRIPTION (starts "17-0 Draft:", says "soccer");
 * - every page: one <title> carrying the "17-0 Draft" brand, one description, og:title present,
 *   canonical = its sitemap URL, og:url = canonical, no noindex, no "odds" in title/descriptions;
 * - every page (plus 404 and an unknown /r/ code): the visible "Fan-made, not affiliated with UEFA" line;
 * - the workers.dev host is noindex (X-Robots-Tag), the custom domain is not;
 * - the IndexNow key file is in dist/client and its content is its own name.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { HOME_DESCRIPTION, HOME_TITLE } from "../src/lib/seo";

let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const entry = new URL("../dist/server/index.js", import.meta.url);
if (!existsSync(entry)) { console.error("FAIL dist/server/index.js missing: run `bun run build` first"); process.exit(1); }
const worker = (await import(entry.href)).default as { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> };
const ctx = { waitUntil() {}, passThroughOnException() {} };
const get = (url: string) => worker.fetch(new Request(url, { headers: { "user-agent": "ucl170-internal-check" } }), {}, ctx);
const SITE = "https://ucl17-0.com";
const LINE = "Fan-made, not affiliated with UEFA";
// Keyword-first SEO landing pages keep their own titles: they are 54-57 chars already, and the
// " | 17-0 Draft" suffix would push them to 67-70 (past the 60-char limit post-deploy-check warns on,
// where Google truncates). The brand still reaches search via og:site_name and the WebSite schema.
const KEYWORD_FIRST = ["/ucl-simulator", "/best-xi-of-all-time", "/daily-football-game", "/best-champions-league-players"];
const isKeywordFirst = (p: string) => KEYWORD_FIRST.includes(p) || p.startsWith("/best/");
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const metas = (html: string, key: string) =>
  [...html.matchAll(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`, "g"))].map((m) => decode(m[1]!));
const titles = (html: string) => [...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]!));
const canon = (html: string) => [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]!);
const footerOk = (html: string) => {
  const f = html.slice(html.lastIndexOf("<footer"));
  const at = f.indexOf(LINE);
  return at > 0 && !/\b(hidden|sr-only|invisible|opacity-0)\b/.test(f.slice(f.lastIndexOf("<p", at), at));
};

const sm = await (await get(`${SITE}/sitemap.xml`)).text();
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
t(`sitemap.xml lists URLs (${locs.length})`, locs.length >= 10 && sm.startsWith('<?xml') && sm.includes("</urlset>"));
t("sitemap URLs are all on the custom domain", locs.every((u) => u.startsWith(`${SITE}/`)));

for (const u of locs) {
  const res = await get(u);
  const html = await res.text();
  const p = new URL(u).pathname;
  const tt = titles(html), d = metas(html, "description"), ogt = metas(html, "og:title");
  const ok =
    res.status === 200 &&
    tt.length === 1 && (isKeywordFirst(p) || tt[0]!.includes("17-0 Draft")) && tt[0]!.length <= 60 &&
    d.length === 1 && ogt.length === 1 && metas(html, "twitter:title").length === 1 &&
    metas(html, "og:description").length === 1 &&
    canon(html).length === 1 && canon(html)[0] === u && metas(html, "og:url")[0] === u &&
    !/<meta name="robots" content="[^"]*noindex/.test(html) && !/noindex/i.test(res.headers.get("x-robots-tag") ?? "") &&
    ![...tt, ...d, ...metas(html, "og:description"), ...metas(html, "twitter:description")].some((s) => /\bodds\b/i.test(s));
  t(`${p}: 200, one title ≤60 chars${isKeywordFirst(p) ? " (keyword-first, own title)" : " with brand"} (${tt[0]}), one description, canonical = og:url = sitemap URL, indexable, no "odds"`, ok);
  t(`${p}: visible "${LINE}" footer line`, footerOk(html));
  if (p === "/") {
    t("home: <title> exact", tt[0] === HOME_TITLE);
    t("home: og:title and twitter:title exact", ogt[0] === HOME_TITLE && metas(html, "twitter:title")[0] === HOME_TITLE);
    t("home: description, og:description, twitter:description all HOME_DESCRIPTION", [d, metas(html, "og:description"), metas(html, "twitter:description")].every((x) => x[0] === HOME_DESCRIPTION));
  }
}
t('HOME_DESCRIPTION starts "17-0 Draft:" and says soccer, never odds', HOME_DESCRIPTION.startsWith("17-0 Draft:") && /\bsoccer\b/.test(HOME_DESCRIPTION) && !/\bodds\b/i.test(HOME_DESCRIPTION));

for (const [name, u] of [["404 page", `${SITE}/no-such-page`], ["unknown /r/ code", `${SITE}/r/garbage`]] as const) {
  const html = await (await get(u)).text();
  t(`${name}: footer line visible`, footerOk(html));
  t(`${name}: default og:title present (no empty link preview)`, metas(html, "og:title").length === 1);
}

const dev = await get("https://ucl-17-0.ucl17zero.workers.dev/");
t("workers.dev host: X-Robots-Tag noindex", /noindex/.test(dev.headers.get("x-robots-tag") ?? ""));

const keys = readdirSync(new URL("../dist/client/", import.meta.url)).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
t("IndexNow key file: exactly one /<32 hex>.txt in dist/client", keys.length === 1);
if (keys[0]) t("IndexNow key file content is its own name (no newline)", readFileSync(new URL(`../dist/client/${keys[0]}`, import.meta.url), "utf8") === keys[0].slice(0, -4));

if (fails) { console.error(`${fails} failed`); process.exit(1); }
console.log("all SEO build checks passed");
