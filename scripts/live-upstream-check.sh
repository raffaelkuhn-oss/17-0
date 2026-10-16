#!/usr/bin/env bash
# Live check for football-data.org: ONE cheap request (GET /v4/competitions/CL), prints the status class.
#   ok | blocked (403/429: bad/over-quota key, free-tier limit, or IP refused) | not_found (404) | error
# Free tier: 10 requests/minute, CL included; the weekly Worker job uses 2. This uses 1.
# Note: runs from this machine's IP, not Worker egress. The Worker logs its own class on each cron run
# ("live form update blocked: ..."), see src/lib/live/update.ts.
# Usage: FOOTBALL_DATA_API_KEY=... scripts/live-upstream-check.sh   (skips with exit 0 if the key is unset)
# Exit: 0 ok/skip, 1 blocked/not_found/error. The key is never printed.
set -uo pipefail
KEY="$(printf '%s' "${FOOTBALL_DATA_API_KEY:-}" | tr -d '[:space:]')"
if [ -z "$KEY" ]; then echo "skip football-data check: FOOTBALL_DATA_API_KEY not set"; exit 0; fi
hdr=$(mktemp); trap 'rm -f "$hdr"' EXIT
code=$(curl -s -o /dev/null -D "$hdr" -w '%{http_code}' --max-time 15 \
  -H "X-Auth-Token: $KEY" "https://api.football-data.org/v4/competitions/CL")
case "$code" in
  2??) cls=ok ;; 403|429) cls=blocked ;; 404) cls=not_found ;; *) cls=error ;;
esac
left=$(grep -i '^x-requests-available-minute:' "$hdr" | tr -d '\r' | sed -E 's/^[^:]+: *//')
echo "football-data: $cls (HTTP ${code:-none}; requests left this minute: ${left:-unknown})"
[ "$cls" = ok ]
