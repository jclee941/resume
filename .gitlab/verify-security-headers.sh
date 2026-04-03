#!/bin/sh
# =============================================================================
# verify-security-headers.sh - Security Header Checks (CSP, HSTS, X-Content-Type)
# Part of .gitlab-ci.yml verify stage
# Source: .github/workflows/verify.yml security-headers checks
# =============================================================================
set -euo pipefail

PORTFOLIO_URL="${1:-https://resume.jclee.me}"
TIMEOUT="${2:-30}"
UA='Mozilla/5.0 (GitLabCI VerifyDeployment; +https://gitlab.jclee.me)'

echo "🔒 Checking Security Headers..."

HEADERS=$(curl -fsSIL --http1.1 --connect-timeout 10 --retry 3 --retry-delay 2 --max-time "$TIMEOUT" \
    -A "$UA" "$PORTFOLIO_URL/" 2>/dev/null) || true

# CSP Check
echo "  Checking Content Security Policy..."
if echo "$HEADERS" | grep -qi "content-security-policy"; then
    CSP=$(echo "$HEADERS" | grep -i "content-security-policy" | head -1)
    if echo "$CSP" | grep -q "script-src.*sha256"; then
        echo "✅ CSP: Strict (SHA-256 hashes)"
    elif echo "$CSP" | grep -q "script-src.*unsafe-inline"; then
        echo "⚠️  CSP: Uses unsafe-inline"
    else
        echo "✅ CSP: Present"
    fi
else
    echo "⚠️  CSP: Missing or not exposed to this runner (non-blocking)"
fi

# HSTS Check
echo "  Checking HSTS Header..."
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    HSTS=$(echo "$HEADERS" | grep -i "strict-transport-security" | head -1)
    if echo "$HSTS" | grep -q "preload"; then
        echo "✅ HSTS: With preload"
    else
        echo "⚠️  HSTS: Without preload"
    fi
else
    echo "⚠️  HSTS: Missing or not exposed to this runner (non-blocking)"
fi

# X-Content-Type-Options Check
echo "  Checking X-Content-Type-Options..."
HEADERS_XCTO=$(curl -sI --max-time "$TIMEOUT" "$PORTFOLIO_URL/" 2>/dev/null) || true
if echo "$HEADERS_XCTO" | grep -qi "x-content-type-options.*nosniff"; then
    echo "✅ X-Content-Type-Options: nosniff"
else
    echo "❌ X-Content-Type-Options: Missing or incorrect"
    exit 1
fi

# X-Frame-Options Check
echo "  Checking X-Frame-Options..."
if echo "$HEADERS" | grep -qi "x-frame-options"; then
    XFRAME=$(echo "$HEADERS" | grep -i "x-frame-options" | head -1 | tr -d '\r')
    echo "✅ X-Frame-Options: ${XFRAME#*: }"
else
    echo "⚠️  X-Frame-Options: Missing (CSP frame-ancestors may cover)"
fi

echo "✅ Security headers verification complete"
exit 0
