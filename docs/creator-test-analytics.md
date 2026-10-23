# Creator test: per-ref analytics

Links: `https://ucl17-0.com/?ref=c01&utm_source=tiktok&utm_medium=creator&utm_campaign=creator-test` (c01–c30).
Data: Workers Analytics Engine dataset `ucl170_retention`, aggregate counts only (no IP, cookie or ID).
Columns: `blob1` event · `blob2` day bucket · `blob3` mode · `blob4` source (`direct`/`x`/`reddit`/`hn`/`google`/`bing`/`duckduckgo`/`facebook`/`instagram`/`linkedin`/`youtube`/`tiktok`/`producthunt`/`newsletter`/`share`/`other`; `share` = landed on a shared run `/r/<code>` or a Challenge link `/draft?c=<code>`, from the share PR, see below) · `blob5` ref (`c01`–`c30`/`none`; empty for rows written before this change) · `blob6` traffic (`internal`/`bot`/`public`; empty for rows written before 18 Oct 2026; `bot` from 19 Oct) · `blob7` share path on `share_click` (`native`/`file`/`copy`/`x`/`whatsapp`/`download`/`challenge`; `none` otherwise, empty before the share PR) · `blob8` outcome on `sim_complete` (`perfect`/`champion`/`final`/`ko`/`league`, see `outcomeOf()` in `src/lib/retention.ts`; empty on other events, on invalid values and for rows written before the outcome PR).

## Share landings (`blob4 = 'share'`)

Share links carry no tag (no `utm`/`ref`: long tagged links look like scams in DMs), so a share landing is
recognised by its path. Precedence for the source of a visit (`landingSource()` in `src/lib/retention.ts`):
1. explicit tag on the URL: `utm_source`, or a valid creator `ref` (`c01`–`c30`): source as before (utm bucket, else referrer);
2. landing path `/r/<code>` (all Classic/Legend shares) or `/draft?c=<code>` (Challenge a friend): `share`;
3. same-site referrer that is one of those paths (tapped through from `/r/` before the page hydrated): `share`;
4. otherwise the referrer bucket (`direct` when none).

| Share path | URL | Source on landing |
| --- | --- | --- |
| Image-file share, native share, copy fallback, Post on X, WhatsApp, Copy text (Classic/Legend) | `https://ucl17-0.com/r/<code>` | `share` |
| Challenge a friend | `https://ucl17-0.com/draft?c=<code>` | `share` |
| Daily (all paths) | `https://ucl17-0.com/daily` | unattributed (referrer/`direct`) |
| Live-preview / extra-pool runs | `https://ucl17-0.com/draft` | unattributed (no code: picks aren't in the legends pool, so `/r/` can't rebuild them) |
| Save image | no link | n/a |

As with every source, only the browser's **first** visit sets it; nothing new is stored (same `ucl170:retention` key, same blobs).
Share landings are counted from the deploy of this change; earlier WhatsApp/iMessage landings show as `direct`.

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

Shares per path (share rate per finished run = shares ÷ sim_complete):
```sql
SELECT blob7 AS via, SUM(_sample_interval) AS shares
FROM ucl170_retention
WHERE timestamp > NOW() - INTERVAL '14' DAY AND blob1 = 'share_click' AND blob6 NOT IN ('internal','bot')
GROUP BY via ORDER BY shares DESC
```

## Internal test traffic

Our own scripted checks (post-deploy-check, Playwright/headless runs) send the fixed user-agent token
`ucl170-internal-check`. The Worker maps it, and the default `HeadlessChrome` UA, to `blob6 = 'internal'`;
the UA itself is never stored. `creator-dashboard.ts` already excludes it. In your own queries add:

```sql
  AND blob6 NOT IN ('internal','bot')   -- keeps 'public' and pre-marker rows (blob6 = '')
```

Internal-only view: `WHERE blob6 = 'internal'`.

## Bot traffic (from 19 Oct)

The Worker also maps self-declared crawlers and automation libraries (`Googlebot/2.1`, `bingbot/2.0`,
`GPTBot/1.0`, `Bytespider`, `facebookexternalhit`, Lighthouse, `python-requests`, `curl/`, …; see
`BOT_UA` in `src/lib/traffic.ts`) to `blob6 = 'bot'`. Same mechanism as `internal`: the UA is matched
against fixed patterns and never stored; nothing new is collected. The dashboard excludes `internal` and
`bot` and prints how many events it left out.

Many plays per visit is **not** treated as a bot: `visit` counts once per browser per UTC day while every
draft counts, so one keen player can produce 20+ drafts from 1 visit (e.g. 19 Oct 06:10–06:46 UTC: 1 Daily +
~22 classic drafts at ~1/min with pauses and a file share, which needs a real phone's share sheet).

Any new script that loads the site must send the token:
- curl: `-A "my-check ucl170-internal-check"`
- Playwright: `browser.newContext({ userAgent: navigator.userAgent + " ucl170-internal-check" })`

Rows written before the marker (e.g. the scripted runs on Wed 14 Oct) can't be re-tagged; treat that day as noisy
or subtract the known test counts by hand.

**Cloudflare Web Analytics** has no user-agent or IP filter for its JS beacon, so tagged visits can't be excluded
there after the fact. The served HTML currently contains no `cloudflareinsights` beacon (checked 16 Oct). If Web
Analytics is turned on, block the beacon in scripted runs instead: Playwright
`context.route("**/static.cloudflareinsights.com/**", r => r.abort())` (curl never runs the beacon). In the zone's
HTTP traffic analytics you can filter out `User Agent contains ucl170-internal-check`.

## Caveats
- First visit wins: people who visited before keep no ref.
- Per browser: cleared storage, private mode or a second device count as new, so numbers run slightly low.
- `return_d7` fires on day 7 or later, once per browser; read 7-day return for a cohort only once 7+ days have passed.
- Counts are sampled at high volume (`SUM(_sample_interval)`); data kept ~3 months.
- Cloudflare Web Analytics can't see query strings, so `?ref` is only visible here.
