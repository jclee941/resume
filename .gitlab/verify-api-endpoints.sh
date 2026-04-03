#!/bin/sh
# =============================================================================
# verify-api-endpoints.sh - API Endpoint Checks (Vitals, robots.txt, sitemap)
# Part of .gitlab-ci.yml verify stage
# Source: .github/workflows/verify.yml api-endpoints checks
# =============================================================================
set -euo pipefail

PORTFOLIO_URL="${1:-https://resume.jclee.me}"
TIMEOUT="${2:-30}"

echo "🔗 Checking API Endpoints..."

# Web Vitals Endpoint Check
echo "  Checking Web Vitals Endpoint..."
VITALS_DATA="{\"lcp\":1250,\"fid\":50,\"cls\":0.05,\"url\":\"/\",\"timestamp\":$(date +%s000)}"
HTTP_CODE=$(curl -sf -X POST --max-time "$TIMEOUT" "$PORTFOLIO_URL/api/vitals" \
    -H "Content-Type: application/json" \
    -d "$VITALS_DATA" \
    -w "%{http_code}" \
    -o /dev/null 2>/dev/null) || HTTP_CODE="000"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Vitals Endpoint: HTTP $HTTP_CODE"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "⚠️  Vitals Endpoint: Not responding (non-blocking)"
else
    echo "⚠️  Vitals Endpoint: HTTP $HTTP_CODE (non-blocking)"
fi

# robots.txt Check
echo "  Checking robots.txt..."
if curl -sf --max-time "$TIMEOUT" "$PORTFOLIO_URL/robots.txt" 2>/dev/null | grep -qi "user-agent"; then
    echo "✅ robots.txt: Present and valid"
else
    echo "⚠️  robots.txt: Missing or invalid (non-blocking)"
fi

# sitemap.xml Check
echo "  Checking sitemap.xml..."
SITEMAP=$(curl -sf --max-time "$TIMEOUT" "$PORTFOLIO_URL/sitemap.xml" 2>/dev/null) || true
if echo "$SITEMAP" | grep -qi "<urlset"; then
    URL_COUNT=$(echo "$SITEMAP" | grep -c "<url>" || echo "0")
    echo "✅ sitemap.xml: $URL_COUNT URLs"
else
    echo "⚠️  sitemap.xml: Missing or invalid (non-blocking)"
fi

echo "✅ API endpoints verification complete"
exit 0
