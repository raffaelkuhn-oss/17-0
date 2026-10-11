# 17-0 — Champions League draft & sim game

TanStack Start (React 19, Tailwind v4) running on **Cloudflare Workers** (static assets + SSR worker).

## Develop

```bash
bun install
bun run dev        # local dev server
bun run typecheck
bun run build      # outputs dist/client + dist/server
bun run preview    # serve the production build locally
```

## Deploy to Cloudflare

1. `bunx wrangler login` (or set `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` for CI).
2. *(Optional, leaderboard)* add secrets after the first deploy:
   ```bash
   bunx wrangler secret put SUPABASE_URL
   bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```
3. `bun run deploy` — builds and runs `wrangler deploy`. Live at `https://ucl-17-0.<your-subdomain>.workers.dev`.
4. **Custom domain:** Cloudflare dashboard → Workers & Pages → `ucl-17-0` → Settings → Domains & Routes → Add → Custom domain (domain's DNS must be on Cloudflare). Or add to `wrangler.jsonc`: `"routes": [{ "pattern": "example.com", "custom_domain": true }]`.
5. **Site URL:** canonicals, og:url, sitemap, JSON-LD and share links come from `src/lib/site.ts`. Set `VITE_SITE_URL=https://example.com` at build time (e.g. `VITE_SITE_URL=https://example.com bun run deploy`, or in `.env`); the build also rewrites `public/robots.txt` and `public/llms.txt`. Default is still `https://ucl-17-0.lovable.app` until a domain exists.

## Optional build-time settings

Set in `.env` or the build environment (they are inlined at build time):

- `VITE_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics token. When set, the beacon (`https://static.cloudflareinsights.com/beacon.min.js`, `defer`) is added to every page; when unset (default) no analytics script is rendered.
- `VITE_TIP_URL` — link for the "Support the project" card on the home page (see `src/lib/tip.ts`). When unset (default) the card is not rendered at all.

## Leaderboard (optional, Supabase)

The daily leaderboard is the only backend. It is **disabled and hidden** if the secrets above are missing — the game itself works without it.

1. Create a Supabase project.
2. Run the two files in `supabase/migrations/` in order (SQL editor): table + policies, then lock writes to the service role and add the unique-name index.
3. Set the Cloudflare secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role key stays server-side only; it is never sent to the browser).
For local dev put the same two vars in `.env`/`.dev.vars` (git-ignored).

## Sim balance knobs

All balance numbers live in `SIM_TUNING` in `src/lib/sim.ts`, the single module used by the client, the daily seed and the server-side leaderboard re-simulation (`submitDailyResult`).
- `KO_BASE` / `KO_STEP`: knockout opponent strength = `KO_BASE + round * KO_STEP` (league opponents are 66-76). Current: `KO_BASE` 72, `KO_STEP` 3 (opponents 72, 75, 78, 81, 84 across Playoff..Final).
- `MID_ATTACK_WEIGHT`: weight of midfielders' attack in the team attack rating (weighted average; forwards weigh 1).

Re-tune with `bun scripts/sim-harness.ts 100000` (random, greedy best-of-4, best XI). Env `KO_BASE`, `KO_STEP`, `MID_W` override knobs for sweeps.

## Daily replay deterrent (optional env)

`DAILY_COOKIE_SECRET` (Worker secret, e.g. `wrangler secret put DAILY_COOKIE_SECRET`) enables a signed,
httpOnly, SameSite=Lax cookie set when the daily is completed / submitted to the leaderboard. If unset the
daily falls back to localStorage only. Without accounts this is a deterrent, not a guarantee: clearing
cookies and storage (or switching browser/device) gives a fresh attempt.
