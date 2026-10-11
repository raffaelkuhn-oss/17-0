# 17-0 — Champions League draft & sim game

Exported from Lovable on 2026-10-11. Stack: TanStack Start v1, React 19, TypeScript, Tailwind v4, Bun.

## Starting this in a new chat / new project

1. Open a new Lovable project and paste or attach this code, or clone it from the connected GitHub repo.
2. Turn on the backend (Lovable Cloud) for the new project, then apply the two files in `supabase/migrations/` in order — they create the `daily_leaderboard` table, its policies, and the unique name-per-day index.
3. `src/integrations/supabase/*` and the `.env` lines `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` are auto-generated per project — let the new project regenerate them instead of reusing this project's values.
4. Install and run: `bun i` then `bun run dev`.

## What is in here

- `src/lib/players.ts` — 152 legends with per-role ratings (GK, CB, RB, LB, DM, CM, AM, RW, LW, ST)
- `src/lib/sim.ts` — Poisson campaign sim: 8 league games (draws allowed, 11 points to advance), then two-leg knockouts and a one-leg final; 17 games total
- `src/lib/daily.ts` — deterministic daily challenge (same draw for everyone, same day)
- `src/lib/leaderboard.functions.ts` — server-side re-simulation before a score is saved to the daily board
- `src/lib/share-image.ts` — Canvas-drawn result image for sharing
- `src/routes/` — game, daily challenge, legends table, simulator, and the SEO ranking pages

## Not included

`.env`, `node_modules/`, `.git/`, and Lovable's own project metadata. Backend data (daily leaderboard rows) is exported separately from Cloud → Advanced settings → Export data.
