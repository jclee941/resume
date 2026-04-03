#!/bin/sh
# =============================================================================
# verify-performance.sh - Performance Metrics Checks (Metrics endpoint, compression)
# Part of .gitlab-ci.yml verify stage
# Source: .github/workflows/verify.yml performance checks
# =============================================================================
set -euo pipefail

PORTFOLIO_URL="${1:-https://resume.jclee.me}"
TIMEOUT="${2:-30}"

echo "📊 Checking Performance Metrics..."

# Prometheus Metrics Endpoint Check
echo "  Checking Prometheus Metrics Endpoint..."
METRICS=$(curl -sf --max-time "$TIMEOUT" "$PORTFOLIO_URL/metrics" 2>/dev/null) || true
if [ -n "$METRICS" ]; then
    METRIC_COUNT=0
    echo "$METRICS" | grep -q "http_requests_total" && METRIC_COUNT=$((METRIC_COUNT + 1))
    echo "$METRICS" | grep -q "http_response_time" && METRIC_COUNT=$((METRIC_COUNT + 1))
    echo "$METRICS" | grep -q "vitals_received" && METRIC_COUNT=$((METRIC_COUNT + 1))

    if [ $METRIC_COUNT -ge 2 ]; then
        REQ_TOTAL=$(echo "$METRICS" | grep "http_requests_total" | grep -oP '\d+' | tail -1 || echo "N/A")
        echo "✅ Metrics Endpoint: $METRIC_COUNT/3 metrics found, $REQ_TOTAL total requests"
    else
        echo "⚠️  Metrics Endpoint: Only $METRIC_COUNT/3 metrics found"
    fi
else
    echo "⚠️  Metrics Endpoint: Not accessible (non-blocking)"
fi

# Gzip/Brotli Compression Check
echo "  Checking Compression..."
ENCODING=$(curl -sI -H "Accept-Encoding: gzip, br" --max-time "$TIMEOUT" "$PORTFOLIO_URL/" 2>/dev/null \
    | grep -i "content-encoding" | head -1 | tr -d '\r') || true

if echo "$ENCODING" | grep -qi "br"; then
    echo "✅ Compression: Brotli"
elif echo "$ENCODING" | grep -qi "gzip"; then
    echo "✅ Compression: Gzip"
else
    echo "⚠️  Compression: None detected (non-blocking)"
fi

# Cache-Control Headers Check
echo "  Checking Cache-Control Headers..."
CACHE_CONTROL=$(curl -sI --max-time "$TIMEOUT" "$PORTFOLIO_URL/" 2>/dev/null \
    | grep -i "cache-control" | head -1 | tr -d '\r') || true

if echo "$CACHE_CONTROL" | grep -qi "max-age"; then
    echo "✅ Cache-Control: ${CACHE_CONTROL#*: }"
else
    echo "⚠️  Cache-Control: Not set (non-blocking)"
fi

echo "✅ Performance verification complete"
exit 0
