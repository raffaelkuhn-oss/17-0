// Rewrites the site origin in static files (robots.txt, llms.txt) when VITE_SITE_URL is set.
import { readFileSync, writeFileSync } from "node:fs";
const url = (process.env.VITE_SITE_URL ?? "").trim().replace(/\/+$/, "");
if (url) {
  for (const f of ["public/robots.txt", "public/llms.txt"]) {
    const s = readFileSync(f, "utf8");
    writeFileSync(f, s.replace(/https?:\/\/ucl-17-0\.lovable\.app|https?:\/\/[^\s/)]+(?=\/sitemap\.xml)/g, url));
  }
  console.log(`Site URL set to ${url}`);
}
