import { SITE_URL, absUrl } from "@/lib/site";
import interWoff2 from "@/assets/fonts/inter-latin-var.woff2?url";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { trackVisit } from "@/lib/retention";

import appCss from "../styles.css?url";

const CF_ANALYTICS_TOKEN = (
  import.meta.env["VITE_CF_ANALYTICS_TOKEN"] as string | undefined
)?.trim();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#246828" },
      { title: "Champions League All-Time Draft | 17-0 Draft" },
      {
        name: "description",
        content:
          "Draft an all-time Champions League XI and simulate the whole campaign. Can you go 17-0?",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "17-0 Draft" },
      { property: "og:image", content: absUrl("/og-image-v2.jpg") },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/jpeg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: absUrl("/og-image-v2.jpg") },
      {
        property: "og:image:alt",
        content: "17-0 Draft: 11 position cards in a 4-3-3 on a green pitch next to a 17-0 badge",
      },
      {
        name: "twitter:image:alt",
        content: "17-0 Draft: 11 position cards in a 4-3-3 on a green pitch next to a 17-0 badge",
      },
      {
        name: "google-site-verification",
        content: "pviOn8YkPYYbzu_PP2vp8OapSTcaA2DubHk8MZymVeU",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Self-hosted Inter (src/styles.css @font-face): preload the one woff2 so text paints in Inter
      // without a render-blocking third-party stylesheet.
      { rel: "preload", href: interWoff2, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [
      // Cloudflare Web Analytics: off unless VITE_CF_ANALYTICS_TOKEN is set at build time.
      ...(CF_ANALYTICS_TOKEN
        ? [
            {
              src: "https://static.cloudflareinsights.com/beacon.min.js",
              defer: true,
              "data-cf-beacon": JSON.stringify({ token: CF_ANALYTICS_TOKEN }),
            },
          ]
        : []),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "17-0",
          alternateName: "17-0 Champions League Draft Simulator",
          url: SITE_URL,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "17-0",
          url: SITE_URL,
          logo: absUrl("/favicon.png"),
        }),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Cookieless retention flag (localStorage only); no-op unless VITE_RETENTION_ENABLED=1.
  useEffect(() => trackVisit(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </QueryClientProvider>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-border bg-background px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2.5"
          aria-label="17-0 Draft home"
        >
          <img src="/logo-64.png" alt="" width={32} height={32} className="size-8 rounded-full" />
          <span className="text-lg leading-none whitespace-nowrap">
            <span className="font-black">17-0</span> <span className="font-medium">Draft</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 text-sm text-muted-foreground">
        <nav aria-label="Game modes" className="flex flex-wrap gap-x-5">
          <Link to="/draft" className="inline-flex min-h-11 items-center hover:text-foreground">
            Draft an XI
          </Link>
          <Link to="/daily" className="inline-flex min-h-11 items-center hover:text-foreground">
            Daily challenge
          </Link>
          <Link
            to="/ucl-simulator"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Champions League simulator
          </Link>
          <Link
            to="/football-draft-game"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Football draft game
          </Link>
          <Link
            to="/daily-football-game"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Daily football game
          </Link>
          <Link
            to="/how-it-works"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            to="/how-the-chances-work"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            How the chances work
          </Link>
        </nav>
        <nav aria-label="Rankings" className="flex flex-wrap gap-x-5">
          <Link
            to="/best-champions-league-players"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Best Champions League players
          </Link>
          <Link
            to="/best-xi-of-all-time"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Best XI of all time
          </Link>
          <Link
            to="/best/$position"
            params={{ position: "strikers" }}
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Best strikers
          </Link>
          <Link
            to="/best/$position"
            params={{ position: "midfielders" }}
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Best midfielders
          </Link>
          <Link
            to="/best/$position"
            params={{ position: "centre-backs" }}
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Best centre backs
          </Link>
          <Link
            to="/best/$position"
            params={{ position: "goalkeepers" }}
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Best goalkeepers
          </Link>
          <Link to="/legends" className="inline-flex min-h-11 items-center hover:text-foreground">
            Legends pool
          </Link>
          <Link
            to="/82-0-football"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            82-0 for football
          </Link>
        </nav>
        <p className="text-xs">
          17-0 — draft eleven legends, win seventeen matches. Free, no account.
        </p>
        <p className="text-xs">
          To count returning visitors, this site stores an anonymous first-visit date in your
          browser; there are no tracking cookies and no personal data. A small cookie only stops the
          daily challenge from being replayed, and Cloudflare Web Analytics counts visits without
          cookies.{" "}
          <span data-testid="footer-daily-privacy">
            Your Daily results, streak and stats stay in your browser only and are never sent to us.
          </span>
        </p>
        <p className="text-xs" data-testid="footer-legal">
          <span className="whitespace-nowrap">
            Sponsor or partner?{" "}
            <a
              href="mailto:ucl17zero@gmail.com"
              className="inline-flex min-h-11 items-center text-primary hover:underline"
            >
              ucl17zero@gmail.com
            </a>
          </span>{" "}
          <span className="whitespace-nowrap">· Fan-made, not affiliated with UEFA</span>
        </p>
      </div>
    </footer>
  );
}
