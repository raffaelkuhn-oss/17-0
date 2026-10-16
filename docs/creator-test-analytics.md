# Creator test: per-ref analytics

Links: `https://ucl17-0.com/?ref=c01&utm_source=tiktok&utm_medium=creator&utm_campaign=creator-test` (c01–c10).
Data: Workers Analytics Engine dataset `ucl170_retention`, aggregate counts only (no IP, cookie or ID).
Columns: `blob1` event · `blob2` day bucket · `blob3` mode · `blob4` source · `blob5` ref (`c01`–`c10`/`none`; empty for rows written before this change).

## Dashboard (terminal)

```sh
CF_ACCOUNT_ID=431abb4b541bf4a792e77a72c3c20d1a CF_ANALYTICS_TOKEN=<Account Analytics: Read> bun scripts/creator-dashboard.ts 30
```

Prints one row per ref: first visits, drafts, runs, shares, share rate (shares ÷ runs), d7+ returns, d7 rate (d7+ returns ÷ first visits). Uses the existing read-only analytics token; no new secret, account or vendor.

## Queries (`POST https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql`, body = SQL)

Funnel per ref:
```sql
SELECT blob5 AS ref, blob1 AS event, SUM(_sample_interval) AS n
FROM ucl170_retention
WHERE timestamp > NOW() - INTERVAL '30' DAY
  AND blob1 IN ('visit','draft_start','sim_complete','share_click','return_d7')
GROUP BY ref, event ORDER BY ref, event
```

New players per ref per day (weekly players = sum over 7 days):
```sql
SELECT toDate(timestamp) AS day, blob5 AS ref, SUM(_sample_interval) AS first_visits
FROM ucl170_retention
WHERE timestamp > NOW() - INTERVAL '30' DAY AND blob1 = 'visit' AND blob2 = 'd0' AND blob5 != 'none' AND blob5 != ''
GROUP BY day, ref ORDER BY day, ref
```

Day-7+ returns per ref per day:
```sql
SELECT toDate(timestamp) AS day, blob5 AS ref, SUM(_sample_interval) AS returns_d7
FROM ucl170_retention
WHERE timestamp > NOW() - INTERVAL '60' DAY AND blob1 = 'return_d7'
GROUP BY day, ref ORDER BY day, ref
```

## Caveats
- First visit wins: people who visited before keep no ref.
- Per browser: cleared storage, private mode or a second device count as new, so numbers run slightly low.
- `return_d7` fires on day 7 or later, once per browser; read 7-day return for a cohort only once 7+ days have passed.
- Counts are sampled at high volume (`SUM(_sample_interval)`); data kept ~3 months.
- Cloudflare Web Analytics can't see query strings, so `?ref` is only visible here.
