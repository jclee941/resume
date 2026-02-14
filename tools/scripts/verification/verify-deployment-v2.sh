#!/bin/bash
# Resume Portfolio - Enhanced Deployment Verification Script v2
# Expanded verification with 15+ checks across 5 categories
#
# Categories:
#   1. Service Health (3 checks)
#   2. Security Headers (4 checks)
#   3. Content Integrity (3 checks)
#   4. Performance Metrics (3 checks)
#   5. API Endpoints (3 checks)
#
# Usage: ./verify-deployment-v2.sh [--quick|--full] [--json]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PORTFOLIO_URL="${PORTFOLIO_URL:-https://resume.jclee.me}"
JOB_DASHBOARD_URL="${JOB_DASHBOARD_URL:-https://job.jclee.me}"
MODE="${1:-full}"
OUTPUT_FORMAT="${2:-text}"

# Counters
PASS=0
FAIL=0
WARN=0
TOTAL=0

# Results for JSON output
declare -a RESULTS=()

log_result() {
    local status="$1"
    local category="$2"
    local check="$3"
    local message="$4"
    
    ((TOTAL++))
    
    case "$status" in
        pass)
            ((PASS++))
            echo -e "${GREEN}✓${NC} [$category] $check: $message"
            ;;
        fail)
            ((FAIL++))
            echo -e "${RED}✗${NC} [$category] $check: $message"
            ;;
        warn)
            ((WARN++))
            echo -e "${YELLOW}⚠${NC} [$category] $check: $message"
            ;;
    esac
    
    RESULTS+=("{\"status\":\"$status\",\"category\":\"$category\",\"check\":\"$check\",\"message\":\"$message\"}")
}

# =============================================================================
# CATEGORY 1: SERVICE HEALTH
# =============================================================================
check_service_health() {
    echo -e "\n${CYAN}━━━ [1/5] Service Health ━━━${NC}"
    
    # 1.1 Portfolio Health Endpoint
    if HEALTH=$(curl -sf "$PORTFOLIO_URL/health" 2>/dev/null); then
        STATUS=$(echo "$HEALTH" | jq -r '.status // "unknown"')
        VERSION=$(echo "$HEALTH" | jq -r '.version // "unknown"')
        DEPLOYED_AT=$(echo "$HEALTH" | jq -r '.deployed_at // "unknown"')
        
        if [[ "$STATUS" == "healthy" ]]; then
            log_result "pass" "HEALTH" "Portfolio" "v$VERSION, deployed: ${DEPLOYED_AT:0:19}"
            
            # Check deployment age
            if [[ "$DEPLOYED_AT" != "unknown" ]]; then
                DEPLOYED_EPOCH=$(date -d "$DEPLOYED_AT" +%s 2>/dev/null || echo "0")
                NOW_EPOCH=$(date +%s)
                AGE_HOURS=$(( (NOW_EPOCH - DEPLOYED_EPOCH) / 3600 ))
                
                if [[ $AGE_HOURS -gt 168 ]]; then
                    log_result "warn" "HEALTH" "Deployment Age" "${AGE_HOURS}h old (>7 days)"
                fi
            fi
        else
            log_result "fail" "HEALTH" "Portfolio" "Status: $STATUS (expected: healthy)"
        fi
    else
        log_result "fail" "HEALTH" "Portfolio" "Health endpoint unreachable"
    fi
    
    # 1.2 Job Dashboard Health
    if JOB_HEALTH=$(curl -sf "$JOB_DASHBOARD_URL/api/health" 2>/dev/null); then
        JOB_STATUS=$(echo "$JOB_HEALTH" | jq -r '.status // "unknown"')
        JOB_VERSION=$(echo "$JOB_HEALTH" | jq -r '.version // "unknown"')
        DB_STATUS=$(echo "$JOB_HEALTH" | jq -r '.database // "unknown"')
        
        if [[ "$JOB_STATUS" == "ok" ]]; then
            log_result "pass" "HEALTH" "Job Dashboard" "v$JOB_VERSION, DB: $DB_STATUS"
        else
            log_result "fail" "HEALTH" "Job Dashboard" "Status: $JOB_STATUS"
        fi
    else
        log_result "warn" "HEALTH" "Job Dashboard" "Health endpoint unreachable (may be optional)"
    fi
    
    # 1.3 HTTP Response Time
    RESPONSE_TIME=$(curl -sf -o /dev/null -w "%{time_total}" "$PORTFOLIO_URL/" 2>/dev/null || echo "0")
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)
    
    if [[ "$RESPONSE_MS" -lt 500 ]]; then
        log_result "pass" "HEALTH" "Response Time" "${RESPONSE_MS}ms (<500ms)"
    elif [[ "$RESPONSE_MS" -lt 1000 ]]; then
        log_result "warn" "HEALTH" "Response Time" "${RESPONSE_MS}ms (500-1000ms)"
    else
        log_result "fail" "HEALTH" "Response Time" "${RESPONSE_MS}ms (>1000ms)"
    fi
}

# =============================================================================
# CATEGORY 2: SECURITY HEADERS
# =============================================================================
check_security_headers() {
    echo -e "\n${CYAN}━━━ [2/5] Security Headers ━━━${NC}"
    
    HEADERS=$(curl -sI "$PORTFOLIO_URL/" 2>/dev/null)
    
    # 2.1 Content Security Policy
    if echo "$HEADERS" | grep -qi "content-security-policy"; then
        CSP=$(echo "$HEADERS" | grep -i "content-security-policy" | head -1)
        
        # Check for strict CSP (no unsafe-inline in script-src)
        if echo "$CSP" | grep -q "script-src.*sha256"; then
            log_result "pass" "SECURITY" "CSP" "Strict (SHA-256 hashes)"
        elif echo "$CSP" | grep -q "script-src.*unsafe-inline"; then
            log_result "warn" "SECURITY" "CSP" "Uses unsafe-inline"
        else
            log_result "pass" "SECURITY" "CSP" "Present"
        fi
    else
        log_result "fail" "SECURITY" "CSP" "Missing"
    fi
    
    # 2.2 HSTS
    if echo "$HEADERS" | grep -qi "strict-transport-security"; then
        HSTS=$(echo "$HEADERS" | grep -i "strict-transport-security" | head -1)
        
        if echo "$HSTS" | grep -q "preload"; then
            log_result "pass" "SECURITY" "HSTS" "With preload"
        else
            log_result "warn" "SECURITY" "HSTS" "Without preload"
        fi
    else
        log_result "fail" "SECURITY" "HSTS" "Missing"
    fi
    
    # 2.3 X-Content-Type-Options
    if echo "$HEADERS" | grep -qi "x-content-type-options.*nosniff"; then
        log_result "pass" "SECURITY" "X-Content-Type-Options" "nosniff"
    else
        log_result "fail" "SECURITY" "X-Content-Type-Options" "Missing or incorrect"
    fi
    
    # 2.4 X-Frame-Options
    if echo "$HEADERS" | grep -qi "x-frame-options"; then
        XFRAME=$(echo "$HEADERS" | grep -i "x-frame-options" | head -1 | tr -d '\r')
        log_result "pass" "SECURITY" "X-Frame-Options" "${XFRAME#*: }"
    else
        log_result "warn" "SECURITY" "X-Frame-Options" "Missing (CSP frame-ancestors may cover)"
    fi
}

# =============================================================================
# CATEGORY 3: CONTENT INTEGRITY
# =============================================================================
check_content_integrity() {
    echo -e "\n${CYAN}━━━ [3/5] Content Integrity ━━━${NC}"
    
    HTML=$(curl -sf "$PORTFOLIO_URL/" 2>/dev/null)
    
    # 3.1 Page Title
    if TITLE=$(echo "$HTML" | grep -oP '<title>\K[^<]+' | head -1); then
        if [[ -n "$TITLE" && ${#TITLE} -gt 10 ]]; then
            log_result "pass" "CONTENT" "Title" "${TITLE:0:50}..."
        else
            log_result "warn" "CONTENT" "Title" "Too short or missing"
        fi
    else
        log_result "fail" "CONTENT" "Title" "Missing"
    fi
    
    # 3.2 Open Graph Meta Tags
    OG_COUNT=0
    [[ $(echo "$HTML" | grep -c 'property="og:title"') -gt 0 ]] && ((OG_COUNT++))
    [[ $(echo "$HTML" | grep -c 'property="og:description"') -gt 0 ]] && ((OG_COUNT++))
    [[ $(echo "$HTML" | grep -c 'property="og:image"') -gt 0 ]] && ((OG_COUNT++))
    [[ $(echo "$HTML" | grep -c 'property="og:url"') -gt 0 ]] && ((OG_COUNT++))
    
    if [[ $OG_COUNT -ge 4 ]]; then
        log_result "pass" "CONTENT" "Open Graph" "$OG_COUNT/4 tags"
    elif [[ $OG_COUNT -ge 2 ]]; then
        log_result "warn" "CONTENT" "Open Graph" "$OG_COUNT/4 tags"
    else
        log_result "fail" "CONTENT" "Open Graph" "$OG_COUNT/4 tags"
    fi
    
    # 3.3 OG Image Accessibility
    if curl -sfI "$PORTFOLIO_URL/og-image.webp" 2>/dev/null | grep -q "200"; then
        OG_SIZE=$(curl -sI "$PORTFOLIO_URL/og-image.webp" 2>/dev/null | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
        OG_KB=$((${OG_SIZE:-0} / 1024))
        log_result "pass" "CONTENT" "OG Image" "Accessible (${OG_KB}KB)"
    else
        log_result "fail" "CONTENT" "OG Image" "Not accessible"
    fi
}

# =============================================================================
# CATEGORY 4: PERFORMANCE METRICS
# =============================================================================
check_performance() {
    echo -e "\n${CYAN}━━━ [4/5] Performance Metrics ━━━${NC}"
    
    # 4.1 Prometheus Metrics Endpoint
    if METRICS=$(curl -sf "$PORTFOLIO_URL/metrics" 2>/dev/null); then
        METRIC_COUNT=0
        echo "$METRICS" | grep -q "http_requests_total" && ((METRIC_COUNT++))
        echo "$METRICS" | grep -q "http_response_time" && ((METRIC_COUNT++))
        echo "$METRICS" | grep -q "vitals_received" && ((METRIC_COUNT++))
        
        if [[ $METRIC_COUNT -ge 2 ]]; then
            # Extract request count
            REQ_TOTAL=$(echo "$METRICS" | grep "http_requests_total" | grep -oP '\d+' | tail -1 || echo "N/A")
            log_result "pass" "PERF" "Metrics Endpoint" "$METRIC_COUNT metrics, $REQ_TOTAL total requests"
        else
            log_result "warn" "PERF" "Metrics Endpoint" "Only $METRIC_COUNT/3 metrics found"
        fi
    else
        log_result "fail" "PERF" "Metrics Endpoint" "Not accessible"
    fi
    
    # 4.2 Gzip/Brotli Compression
    ENCODING=$(curl -sI -H "Accept-Encoding: gzip, br" "$PORTFOLIO_URL/" 2>/dev/null | grep -i "content-encoding" | head -1 | tr -d '\r')
    
    if echo "$ENCODING" | grep -qi "br"; then
        log_result "pass" "PERF" "Compression" "Brotli"
    elif echo "$ENCODING" | grep -qi "gzip"; then
        log_result "pass" "PERF" "Compression" "Gzip"
    else
        log_result "warn" "PERF" "Compression" "None detected"
    fi
    
    # 4.3 Cache Headers
    CACHE_CONTROL=$(curl -sI "$PORTFOLIO_URL/" 2>/dev/null | grep -i "cache-control" | head -1 | tr -d '\r')
    
    if echo "$CACHE_CONTROL" | grep -qi "max-age"; then
        log_result "pass" "PERF" "Cache-Control" "${CACHE_CONTROL#*: }"
    else
        log_result "warn" "PERF" "Cache-Control" "Not set"
    fi
}

# =============================================================================
# CATEGORY 5: API ENDPOINTS
# =============================================================================
check_api_endpoints() {
    echo -e "\n${CYAN}━━━ [5/5] API Endpoints ━━━${NC}"
    
    # 5.1 Web Vitals Endpoint
    VITALS_DATA='{"lcp":1250,"fid":50,"cls":0.05,"url":"/","timestamp":'"$(date +%s000)"'}'
    if HTTP_CODE=$(curl -sf -X POST "$PORTFOLIO_URL/api/vitals" \
        -H "Content-Type: application/json" \
        -d "$VITALS_DATA" \
        -w "%{http_code}" \
        -o /dev/null 2>/dev/null); then
        if [[ "$HTTP_CODE" == "200" ]]; then
            log_result "pass" "API" "Vitals Endpoint" "HTTP $HTTP_CODE"
        else
            log_result "warn" "API" "Vitals Endpoint" "HTTP $HTTP_CODE"
        fi
    else
        log_result "fail" "API" "Vitals Endpoint" "Not responding"
    fi
    
    # 5.2 Robots.txt
    if curl -sf "$PORTFOLIO_URL/robots.txt" 2>/dev/null | grep -qi "user-agent"; then
        log_result "pass" "API" "robots.txt" "Present and valid"
    else
        log_result "warn" "API" "robots.txt" "Missing or invalid"
    fi
    
    # 5.3 Sitemap
    if curl -sf "$PORTFOLIO_URL/sitemap.xml" 2>/dev/null | grep -qi "<urlset"; then
        URL_COUNT=$(curl -sf "$PORTFOLIO_URL/sitemap.xml" 2>/dev/null | grep -c "<url>" || echo "0")
        log_result "pass" "API" "sitemap.xml" "$URL_COUNT URLs"
    else
        log_result "warn" "API" "sitemap.xml" "Missing or invalid"
    fi
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Resume Portfolio - Enhanced Deployment Verification v2${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Target: ${CYAN}$PORTFOLIO_URL${NC}"
    echo -e "Mode: ${CYAN}$MODE${NC}"
    echo -e "Time: ${CYAN}$(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
    
    check_service_health
    check_security_headers
    check_content_integrity
    check_performance
    check_api_endpoints
    
    # Summary
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Verification Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    SCORE=$(echo "scale=0; $PASS * 100 / $TOTAL" | bc)
    
    echo -e "${GREEN}✓ Passed:   $PASS/$TOTAL${NC}"
    [[ $WARN -gt 0 ]] && echo -e "${YELLOW}⚠ Warnings: $WARN${NC}"
    [[ $FAIL -gt 0 ]] && echo -e "${RED}✗ Failed:   $FAIL${NC}"
    echo -e "Score: ${CYAN}${SCORE}%${NC}"
    echo ""
    
    # Generate report file for CI artifacts
    REPORT_FILE="${REPORT_FILE:-verification-report.txt}"
    {
        echo "Resume Portfolio Verification Report"
        echo "====================================="
        echo "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
        echo "Target: $PORTFOLIO_URL"
        echo ""
        echo "Results:"
        echo "  Passed:   $PASS/$TOTAL"
        echo "  Warnings: $WARN"
        echo "  Failed:   $FAIL"
        echo "  Score:    ${SCORE}%"
    } > "$REPORT_FILE"
    echo -e "Report saved: ${CYAN}$REPORT_FILE${NC}"
    
    if [[ $FAIL -eq 0 ]]; then
        echo -e "${GREEN}🎉 All critical checks passed!${NC}"
        exit 0
    else
        echo -e "${RED}⚠ Deployment verification failed${NC}"
        exit 1
    fi
}

main "$@"
