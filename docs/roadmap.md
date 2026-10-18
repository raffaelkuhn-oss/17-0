# Roadmap

Dated engineering milestones for 17-0 (ucl17-0.com). The PM owns this file; update it when a date moves.
All times are Europe/Zurich unless marked UTC. The Daily resets at 00:00 UTC.

| Date | Milestone | Status | Notes |
|---|---|---|---|
| Wed 21 Oct 2026 | Remove the old v1 Daily cookie code | Planned | The v1 grace in `src/lib/daily-cookie.ts` ends 21 Oct 00:00 UTC (`V1_ACCEPT_UNTIL_MS`), when every v1 cookie (max-age 36 h, last set 18 Oct) has expired. Small PR: delete the v1 branch and its tests; v2 (`v2.<date>.<state>.<HMAC>`, no ID) stays. |
| Fri 20 Nov 2026 | Live current players launch | Planned | Demo day: "live feature tested". Flag-gated pool of current UCL players with weekly form from football-data.org (`src/lib/live/`). Re-check free agents (Ramos, Pogba, Benzema) with `bun run legend-cl-check` before launch. |
| Mon 23 Nov – Wed 2 Dec 2026 | Daily leaderboard build (Daily-only, optional nickname) | Approved 18 Oct, build after 20 Nov | 7 PRs in order: secret Daily match seed → D1 schema and migrations → submit API (server rebuild, name filter, rate limit) → board UI → admin removal → go-live with the privacy text → Supabase removal. Cloudflare D1 on the existing account, free tier. Go-live Mon 30 Nov, ship by Wed 2 Dec, Thu 3 Dec buffer. No code or D1 database before 20 Nov. |
| Fri 27 Nov 2026 | Load test at 50× normal peak | Planned | Includes the leaderboard endpoints (preview with local D1). |
| Before Fri 4 Dec 2026 | Edge caching to stay under the Workers free cap of 100k requests a day; due before the 4 Dec creator push, or earlier if traffic passes 10k a day. No Workers Paid. | Planned | Trigger: `scripts/worker-requests-check.sh` (box) exits 10 at ≥10k Worker requests in a UTC day. Static assets are already free; the work is caching SSR pages and og images at the edge. |
| From Sun 18 Oct 2026 | Daily request-count alert at 50k. | Planned | Half the free cap. The box script exits 20 at ≥50k requests in a UTC day (today or yesterday, UTC). |
| Fri 4 Dec 2026 | Creator spike | Planned | Freeze from Thu 3 Dec 18:00. If the leaderboard isn't live by Wed 2 Dec, it stays dark until Mon 7 Dec. |
