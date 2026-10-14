#!/usr/bin/env bash
# Post-deploy check: every icon, the manifest, the og:image URL and the key pages must return 200.
# Retries each URL for up to 60s (new static assets can take a few seconds to propagate).
# Usage: scripts/post-deploy-check.sh [base-url]   (default https://ucl17-0.com)
# Exits non-zero if anything is still failing after 60s.
set -uo pipefail
BASE="${1:-https://ucl17-0.com}"
BASE="${BASE%/}"
TIMEOUT=60

PATHS=(
  / /draft /daily /legends /how-it-works /how-the-chances-work
  /best/goalkeepers /best/centre-backs /best/full-backs /best/midfielders /best/wingers /best/strikers
  /sitemap.xml /robots.txt /llms.txt
  /favicon.ico /favicon-16x16.png /favicon-32x32.png /favicon.png /apple-touch-icon.png
  /logo-64.png /icon-192.png /icon-512.png /site.webmanifest
  /og-image.jpg
)

# The og:image URL as actually published in the homepage head.
OG=$(curl -fsS --max-time 15 "$BASE/" | grep -aoE 'property="og:image" content="[^"]+"' | head -1 | sed -E 's/.*content="([^"]+)"/\1/')
if [ -z "$OG" ]; then
  echo "FAIL og:image meta tag not found on $BASE/"
  OG_MISSING=1
else
  OG_MISSING=0
fi

check() {
  local url="$1" start code
  start=$(date +%s)
  while :; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url")
    if [ "$code" = "200" ]; then echo "ok   200 $url"; return 0; fi
    if [ $(( $(date +%s) - start )) -ge "$TIMEOUT" ]; then echo "FAIL $code $url"; return 1; fi
    sleep 5
  done
}

fails=$OG_MISSING
for p in "${PATHS[@]}"; do check "$BASE$p" || fails=$((fails + 1)); done
[ -n "$OG" ] && { check "$OG" || fails=$((fails + 1)); }

# --- http -> https redirect and HSTS ---
# Port 80 may be unreachable from the machine running this, so try a direct request first
# (5s timeout) and fall back to an external header fetch (api.hackertarget.com).
HOST="${BASE#https://}"; HOST="${HOST#http://}"; HOST="${HOST%%/*}"
if [[ "$HOST" == localhost* || "$HOST" == 127.* ]]; then
  echo "skip http->https and HSTS checks for $HOST"
else
  APEX="${HOST#www.}"
  for h in "$APEX" "www.$APEX"; do
    out=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 5 "http://$h/")
    rc=$?
    code="${out%% *}"; loc="${out#* }"
    if [ $rc -eq 0 ] && { [ "$code" = "301" ] || [ "$code" = "308" ]; } && [[ "$loc" == https://* ]]; then
      echo "ok   http://$h/ -> $code $loc (direct)"
      continue
    fi
    echo "info direct http://$h/ gave '${code:-none}' (curl exit $rc); trying hackertarget fallback"
    hdrs=$(curl -s --max-time 20 "https://api.hackertarget.com/httpheaders/?q=http://$h/")
    fcode=$(printf '%s\n' "$hdrs" | head -1 | grep -oE ' [0-9]{3} ' | tr -d ' ')
    floc=$(printf '%s\n' "$hdrs" | grep -i '^location:' | head -1 | sed -E 's/^[Ll]ocation: *//' | tr -d '\r')
    if { [ "$fcode" = "301" ] || [ "$fcode" = "308" ]; } && [[ "$floc" == https://* ]]; then
      echo "ok   http://$h/ -> $fcode $floc (via hackertarget)"
    else
      echo "FAIL http://$h/ does not redirect to https (direct: '${code:-none}' exit $rc; fallback: '${fcode:-none}' '${floc:-no location}')"
      fails=$((fails + 1))
    fi
  done
  hsts=$(curl -sI --max-time 15 "https://$APEX/" | grep -i '^strict-transport-security:' | tr -d '\r')
  if printf '%s' "$hsts" | grep -qi 'max-age=15552000'; then
    echo "ok   HSTS on https://$APEX/: ${hsts#*: }"
  else
    echo "FAIL HSTS: https://$APEX/ has no strict-transport-security with max-age=15552000 (got: '${hsts:-none}')"
    fails=$((fails + 1))
  fi
fi

if [ "$fails" -gt 0 ]; then echo "post-deploy-check: $fails failure(s)"; exit 1; fi
echo "post-deploy-check: all good"
