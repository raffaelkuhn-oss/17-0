import { SITE_URL } from "@/lib/site";
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { POSITION_SLUGS } from "@/lib/position-pages";

const BASE_URL = SITE_URL;

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/draft", changefreq: "weekly", priority: "0.8" },
          { path: "/legends", changefreq: "monthly", priority: "0.7" },
          { path: "/daily", changefreq: "daily", priority: "0.9" },
          { path: "/ucl-simulator", changefreq: "monthly", priority: "0.8" },
          { path: "/best-xi-of-all-time", changefreq: "monthly", priority: "0.8" },
          { path: "/how-it-works", changefreq: "monthly", priority: "0.7" },
          { path: "/how-the-chances-work", changefreq: "monthly", priority: "0.6" },
          { path: "/82-0-football", changefreq: "monthly", priority: "0.8" },
          { path: "/football-draft-game", changefreq: "monthly", priority: "0.8" },
          { path: "/daily-football-game", changefreq: "monthly", priority: "0.8" },
          { path: "/best-champions-league-players", changefreq: "monthly", priority: "0.8" },
          ...POSITION_SLUGS.map((s) => ({ path: `/best/${s}`, changefreq: "monthly" as const, priority: "0.7" })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
