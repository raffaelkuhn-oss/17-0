import { SITE_URL, absUrl } from "@/lib/site";
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
import { type ReactNode } from "react";

import appCss from "../styles.css?url";

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
      { title: "17-0 — Champions League All-Time Draft" },
      {
        name: "description",
        content:
          "Draft an all-time Champions League XI and simulate the whole campaign. Can you go 17-0?",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
    scripts: [
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

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <SiteFooter />
    </QueryClientProvider>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 text-sm text-muted-foreground">
        <nav aria-label="Game modes" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/draft" search={{ mode: "classic" }} className="hover:text-foreground">
            Draft an XI
          </Link>
          <Link to="/daily" className="hover:text-foreground">
            Daily challenge
          </Link>
          <Link to="/ucl-simulator" className="hover:text-foreground">
            Champions League simulator
          </Link>
          <Link to="/football-draft-game" className="hover:text-foreground">
            Football draft game
          </Link>
          <Link to="/daily-football-game" className="hover:text-foreground">
            Daily football game
          </Link>
          <Link to="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
        </nav>
        <nav aria-label="Rankings" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/best-champions-league-players" className="hover:text-foreground">
            Best Champions League players
          </Link>
          <Link to="/best-xi-of-all-time" className="hover:text-foreground">
            Best XI of all time
          </Link>
          <Link to="/best/$position" params={{ position: "strikers" }} className="hover:text-foreground">
            Best strikers
          </Link>
          <Link to="/best/$position" params={{ position: "midfielders" }} className="hover:text-foreground">
            Best midfielders
          </Link>
          <Link to="/best/$position" params={{ position: "centre-backs" }} className="hover:text-foreground">
            Best centre backs
          </Link>
          <Link to="/best/$position" params={{ position: "goalkeepers" }} className="hover:text-foreground">
            Best goalkeepers
          </Link>
          <Link to="/legends" className="hover:text-foreground">
            Legends pool
          </Link>
          <Link to="/82-0-football" className="hover:text-foreground">
            82-0 for football
          </Link>
        </nav>
        <p className="text-xs">17-0 — draft eleven legends, win seventeen matches. Free, no account.</p>
      </div>
    </footer>
  );
}
