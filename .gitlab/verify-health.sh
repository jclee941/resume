#!/bin/sh
# =============================================================================
# verify-health.sh - Portfolio Health Endpoint Checks
# Part of .gitlab-ci.yml verify stage
# Source: .github/workflows/verify.yml health checks
# =============================================================================
set -euo pipefail

PORTFOLIO_URL="${1:-https://resume.jclee.me}"
TIMEOUT="${2:-30}"
RETRIES=5
DELAY=5
UA='Mozilla/5.0 (GitLabCI VerifyDeployment; +https://gitlab.jclee.me)'

echo "🏥 Checking Portfolio Health..."

for i in $(seq 1 $RETRIES); do
    echo "  Attempt $i/$RETRIES..."
    HEALTH=$(curl -fsSL --http1.1 --connect-timeout 10 --retry 3 --retry-delay 2 --max-time "$TIMEOUT" \
        -A "$UA" -H 'Accept: application/json' \
        "$PORTFOLIO_URL/health" 2>/dev/null) || true

    if [ -n "$HEALTH" ]; then
        STATUS=$(echo "$HEALTH" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
        VERSION=$(echo "$HEALTH" | jq -r '.version // "unknown"' 2>/dev/null || echo "unknown")
        DEPLOYED_AT=$(echo "$HEALTH" | jq -r '.deployed_at // "unknown"' 2>/dev/null || echo "unknown")

        if [ "$STATUS" = "healthy" ]; then
            echo "✅ Portfolio Health: $STATUS (v$VERSION, deployed: ${DEPLOYED_AT:0:19})"

            # Check deployment age
            if [ "$DEPLOYED_AT" != "unknown" ]; then
                DEPLOYED_EPOCH=$(date -d "$DEPLOYED_AT" +%s 2>/dev/null || echo "0")
                NOW_EPOCH=$(date +%s)
                AGE_HOURS=$(( (NOW_EPOCH - DEPLOYED_EPOCH) / 3600 ))
                if [ $AGE_HOURS -gt 168 ]; then
                    echo "⚠️  Deployment Age: ${AGE_HOURS}h old (>7 days)"
                else
                    echo "✅ Deployment Age: ${AGE_HOURS}h old"
                fi
            fi
            exit 0
        elif [ "$STATUS" = "degraded" ]; then
            echo "⚠️  Portfolio Health: degraded (v$VERSION, deployed: ${DEPLOYED_AT:0:19})"
            exit 0
        fi
    fi

    if [ $i -lt $RETRIES ]; then
        echo "  Retrying in ${DELAY}s..."
        sleep $DELAY
    fi
done

echo "⚠️  Portfolio Health: Endpoint unreachable after $RETRIES attempts (non-blocking)"
exit 0
