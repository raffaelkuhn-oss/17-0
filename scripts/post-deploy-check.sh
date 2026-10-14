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

if [ "$fails" -gt 0 ]; then echo "post-deploy-check: $fails failure(s)"; exit 1; fi
echo "post-deploy-check: all good"
