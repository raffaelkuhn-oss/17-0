# Migration notes

This project was exported from Lovable (2026-10-11) and migrated to Cloudflare Workers.
All Lovable tooling, telemetry and the Supabase browser client were removed. The leaderboard is read and written only
through server functions using `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Old leaderboard data was intentionally not migrated.
See `README.md` for deploy steps.
