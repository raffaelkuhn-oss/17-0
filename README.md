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

## Live current players (feature flag, OFF by default)

~20 current UCL players (`src/lib/live/current-players.ts`, one line each) mixed into the **Classic / Legend IQ draft** pool next to the 152 legends, with a weekly form bonus from football-data.org. **The Daily and the server-side leaderboard re-simulation never use them** (`candidatesFor` defaults to the legends array), so daily seeds stay identical.

**Flags (Worker vars / `.dev.vars`):**
- `LIVE_PLAYERS_ENABLED=1`: on for everyone. Unset = off (production today).
- `LIVE_PLAYERS_PREVIEW=1`: on only for `/draft?live=1`. Without this switch `?live=1` is ignored.

**Form formula** (`src/lib/live/form.ts`, from the Notion spec): `events = goals×(FWD 1 | others 1.5) + assists×0.5 + per CL match (win +0.5, loss −0.5) + GK/DEF clean sheet +1`; `form' = clamp(round(0.7·form + events), form±3)`, then clamp to ±5. Goals/assists are deltas of the cumulative CL scorers list between runs (first run = baseline). Effective ATT/DEF/TEC/MEN = base + form. The free tier has no line-ups/minutes, so there's no "did not play" penalty and no per-90 rates.

**Data:** a weekly cron makes 2 calls (`/v4/competitions/CL/scorers?limit=100`, `/v4/competitions/CL/matches?status=FINISHED&dateFrom&dateTo`), well within the free tier's 10 req/min. It stores `current-form:v1` (plus `:prev` for rollback) in KV. If the key, the KV binding or the API fails, the game uses the last stored ratings, or base ratings (form 0). "Data provided by football-data.org" is shown wherever live players are shown.

**Preview locally:**
```bash
echo 'LIVE_PLAYERS_PREVIEW=1' > .dev.vars
bun run build && bun run preview      # open http://localhost:4173/draft?live=1
rm .dev.vars && bun run build         # IMPORTANT: the build copies .dev.vars into dist/server
```
Without KV locally you'll see base ratings ("no form data yet").

**Enable later (PM, not done):**
```bash
npx wrangler kv namespace create LIVE_FORM            # copy the id
npx wrangler secret put FOOTBALL_DATA_API_KEY         # free key: https://www.football-data.org/client/register
```
```jsonc
// wrangler.jsonc
"kv_namespaces": [{ "binding": "LIVE_FORM", "id": "<id from above>" }],
"triggers": { "crons": ["0 4 * * 4"] },               // Thu 04:00 UTC = 06:00 Zurich (summer)
"vars": { "LIVE_PLAYERS_PREVIEW": "1" }               // then "LIVE_PLAYERS_ENABLED": "1" to go public
```
Deploy, then check `npx wrangler secret list`. Balance: `LIVE=1 bun scripts/sim-harness.ts 100000` (`LIVE_FORM=5` = every current player at +5).
