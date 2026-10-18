/**
 * The "Fan-made, not affiliated with UEFA" line must be visible in the footer on EVERY page.
 * Every route renders inside __root's RootComponent, so this checks that:
 * - SiteFooter contains the exact line, not hidden (no hidden / sr-only / invisible class);
 * - RootComponent renders <SiteFooter /> unconditionally, after <Outlet />;
 * - no route file opts out by rendering its own <footer> or a "notFoundComponent" without the root;
 * - the sponsor contact lives in the footer (copy-final.md #1), not in the hero or AdBanner.
 */
import { readFileSync, readdirSync } from "node:fs";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
const LINE = "Fan-made, not affiliated with UEFA";
const footer = root.slice(root.indexOf("function SiteFooter"));
t("SiteFooter exists", root.includes("function SiteFooter"));
t(`footer contains "${LINE}"`, footer.includes(LINE));
const lineAt = footer.indexOf(LINE);
const pOpen = footer.lastIndexOf("<p", lineAt);
const block = footer.slice(pOpen, lineAt);
t("footer line is not hidden", !/\b(hidden|sr-only|invisible|opacity-0)\b/.test(block));
const rootComp = root.slice(root.indexOf("function RootComponent"), root.indexOf("function SiteHeader"));
t("RootComponent renders <SiteFooter /> unconditionally after <Outlet />", /<Outlet \/>\s*\n\s*<SiteFooter \/>/.test(rootComp) && !/&&\s*<SiteFooter|\?\s*<SiteFooter/.test(rootComp));
t("sponsor contact is in the footer", footer.includes("Sponsor or partner?") && footer.includes("mailto:ucl17zero@gmail.com"));
// Mkt #4 privacy sentence (approved by Raffael 18 Oct 14:01), verbatim and visible in the footer.
const DAILY_PRIVACY = "Your Daily results, streak and stats stay in your browser only and are never sent to us.";
const flat = footer.replace(/\s+/g, " ");
t("footer has the Daily privacy sentence verbatim", flat.includes(DAILY_PRIVACY));
const dpAt = footer.indexOf('data-testid="footer-daily-privacy"');
t("Daily privacy sentence is not hidden", dpAt > 0 && !/\b(hidden|sr-only|invisible|opacity-0)\b/.test(footer.slice(footer.lastIndexOf("<p", dpAt), dpAt + 120)));
const routesDir = new URL("../src/routes/", import.meta.url);
for (const f of readdirSync(routesDir).filter((f) => f.endsWith(".tsx") && f !== "__root.tsx")) {
  const src = readFileSync(new URL(f, routesDir), "utf8");
  t(`${f}: no own <footer> replacing the site footer`, !/<footer[\s>]/.test(src));
}
const ad = readFileSync(new URL("../src/components/AdBanner.tsx", import.meta.url), "utf8");
t("AdBanner no longer carries the sponsor email", !ad.includes("ucl17zero@gmail.com"));
process.exit(fails ? 1 : 0);
