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

## Retention tracking (optional, off by default)

Cookieless D1/D7 retention by acquisition source. No cookie banner needed: nothing personal or cross-site is stored.

- **Browser:** one localStorage key `ucl170:retention` = `{ firstSeen, lastSeen, source }` (UTC days + a source bucket from a closed list: `utm_source`, else referrer host, else `direct`). No ID.
- **Worker:** `POST /e` with `{event, bucket, mode, source}` writes one Workers Analytics Engine data point (`blobs = [event, bucket, mode, source]`, `double = 1`). No IP, user agent, cookie or identifier is read or stored. Unknown values are dropped; always answers 204.
- **Events:** `visit` (max once per UTC day per browser), `return_d1`, `return_d7`, `draft_start`, `sim_complete`, `daily_complete`, `share_click`. Buckets: `d0`, `d1`, `d2-6`, `d7`, `d8+`.
- **Harmless when off:** the client sends nothing unless built with `VITE_RETENTION_ENABLED=1`; the endpoint is a no-op unless the `RETENTION` binding exists.

**Enable (PM):** Analytics Engine is on the Workers Free plan and the dataset is created on first write (no create command). Add to `wrangler.jsonc`, then build with `VITE_RETENTION_ENABLED=1` and deploy:

```jsonc
"analytics_engine_datasets": [{ "binding": "RETENTION", "dataset": "ucl170_retention" }]
```

**Read D1/D7** (Analytics Engine SQL API, `POST https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql`, token with *Account Analytics: Read*):

```sql
SELECT toDate(timestamp) AS day, blob4 AS source, blob1 AS event, blob2 AS bucket, SUM(_sample_interval) AS n
FROM ucl170_retention
WHERE timestamp > NOW() - INTERVAL '30' DAY AND blob1 IN ('visit','return_d1','return_d7')
GROUP BY day, source, event, bucket ORDER BY day
```

D1 for day N = `return_d1` on day N ÷ `visit`/`d0` on day N-1 (same source). D7 = `return_d7` on day N ÷ `visit`/`d0` on day N-7. Approximate (clearing storage or switching device looks like a new visitor) but honest without accounts. Analytics Engine keeps data for 3 months.
