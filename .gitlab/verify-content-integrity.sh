#!/bin/sh
# =============================================================================
# verify-content-integrity.sh - Content Integrity Checks (Title, OG tags, OG image)
# Part of .gitlab-ci.yml verify stage
# Source: .github/workflows/verify.yml content-integrity checks
# =============================================================================
set -euo pipefail

PORTFOLIO_URL="${1:-https://resume.jclee.me}"
TIMEOUT="${2:-30}"
UA='Mozilla/5.0 (GitLabCI VerifyDeployment; +https://gitlab.jclee.me)'

echo "📄 Checking Content Integrity..."

HTML=$(curl -fsSL --http1.1 --connect-timeout 10 --retry 3 --retry-delay 2 --max-time "$TIMEOUT" \
    -A "$UA" "$PORTFOLIO_URL/" 2>/dev/null) || true

# Page Title Check
echo "  Checking Page Title..."
TITLE=$(echo "$HTML" | grep -oPi '<title>\K[^<]+' | head -1) || true
if [ -n "$TITLE" ] && [ ${#TITLE} -gt 10 ]; then
    echo "✅ Page Title: ${TITLE:0:50}..."
else
    echo "⚠️  Page Title: Too short or missing (non-blocking)"
fi

# Open Graph Tags Check
echo "  Checking Open Graph Meta Tags..."
OG_COUNT=0
echo "$HTML" | grep -q 'property="og:title"' && OG_COUNT=$((OG_COUNT + 1))
echo "$HTML" | grep -q 'property="og:description"' && OG_COUNT=$((OG_COUNT + 1))
echo "$HTML" | grep -q 'property="og:image"' && OG_COUNT=$((OG_COUNT + 1))
echo "$HTML" | grep -q 'property="og:url"' && OG_COUNT=$((OG_COUNT + 1))

if [ $OG_COUNT -ge 4 ]; then
    echo "✅ Open Graph: $OG_COUNT/4 tags"
elif [ $OG_COUNT -ge 2 ]; then
    echo "⚠️  Open Graph: $OG_COUNT/4 tags"
else
    echo "⚠️  Open Graph: $OG_COUNT/4 tags (non-blocking)"
fi

# OG Image Accessibility Check
echo "  Checking OG Image Accessibility..."
if curl -sfI --max-time "$TIMEOUT" "$PORTFOLIO_URL/og-image.webp" 2>/dev/null | grep -q "200"; then
    OG_SIZE=$(curl -sI --max-time "$TIMEOUT" "$PORTFOLIO_URL/og-image.webp" 2>/dev/null \
        | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
    OG_KB=$((${OG_SIZE:-0} / 1024))
    echo "✅ OG Image: Accessible (${OG_KB}KB)"
else
    echo "❌ OG Image: Not accessible"
    exit 1
fi

echo "✅ Content integrity verification complete"
exit 0
