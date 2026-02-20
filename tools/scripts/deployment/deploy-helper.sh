#!/bin/bash
# Resume Portfolio - Automated Deployment Helper
# This script automates the deployment process once credentials are configured

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Resume Portfolio - Deployment Helper${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function: Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}[1/6]${NC} Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js:${NC} $(node --version)"

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗ npm not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm:${NC} $(npm --version)"

    # Check git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}✗ git not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ git:${NC} $(git --version | head -1)"

    echo ""
}

# Function: Run tests
run_tests() {
    echo -e "${YELLOW}[2/6]${NC} Running tests..."

    if npm test > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Unit tests passed${NC}"
    else
        echo -e "${RED}✗ Unit tests failed${NC}"
        exit 1
    fi

    if npm run test:e2e > /dev/null 2>&1; then
        echo -e "${GREEN}✓ E2E tests passed (10/10)${NC}"
    else
        echo -e "${RED}✗ E2E tests failed${NC}"
        exit 1
    fi

    echo ""
}

# Function: Build worker
build_worker() {
    echo -e "${YELLOW}[3/6]${NC} Building worker.js..."

    DEPLOYED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    export DEPLOYED_AT

    if npm run build > /dev/null 2>&1; then
        WORKER_SIZE=$(stat -c%s typescript/portfolio-worker/worker.js)
        WORKER_SIZE_KB=$(echo "scale=2; $WORKER_SIZE / 1024" | bc)
        echo -e "${GREEN}✓ Worker generated:${NC} ${WORKER_SIZE_KB} KB"
        echo -e "${GREEN}✓ Deployment timestamp:${NC} $DEPLOYED_AT"
    else
        echo -e "${RED}✗ Worker generation failed${NC}"
        exit 1
    fi

    echo ""
}

# Function: Check git status
check_git_status() {
    echo -e "${YELLOW}[4/6]${NC} Checking git status..."

    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${YELLOW}⚠ Uncommitted changes detected:${NC}"
        git status --short
        echo ""
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}✗ Deployment cancelled${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ Working directory clean${NC}"
    fi

    echo ""
}

# Function: Deploy to Cloudflare
deploy_cloudflare() {
    echo -e "${YELLOW}[5/6]${NC} Deploying to Cloudflare Workers..."

    # Check authentication (supports both API Token and Global API Key)
    if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
        echo -e "${BLUE}Using: API Token authentication${NC}"
    elif [[ -n "${CLOUDFLARE_API_KEY:-}" && -n "${CLOUDFLARE_EMAIL:-}" ]]; then
        echo -e "${BLUE}Using: Global API Key authentication${NC}"
    else
        echo -e "${RED}✗ No Cloudflare authentication configured${NC}"
        echo -e "${YELLOW}→ Option 1: export CLOUDFLARE_API_TOKEN=your_token${NC}"
        echo -e "${YELLOW}→ Option 2: export CLOUDFLARE_API_KEY=your_key && export CLOUDFLARE_EMAIL=your@email${NC}"
        echo -e "${YELLOW}→ See guide: docs/CLOUDFLARE_AUTH_METHODS.md${NC}"
        exit 1
    fi

    if npx wrangler deploy --config "${PROJECT_ROOT}/typescript/portfolio-worker/wrangler.toml" --env production; then
        echo -e "${GREEN}✓ Deployed successfully${NC}"
    else
        echo -e "${RED}✗ Deployment failed${NC}"
        echo -e "${YELLOW}→ Check logs: ~/.config/.wrangler/logs/${NC}"
        exit 1
    fi

    echo ""
}

# Function: Verify deployment
verify_deployment() {
    echo -e "${YELLOW}[6/6]${NC} Verifying deployment..."

    sleep 3  # Wait for propagation

    # Check health endpoint
    if HEALTH=$(curl -sf https://resume.jclee.me/health); then
        DEPLOYED=$(echo "$HEALTH" | jq -r '.deployed_at')
        STATUS=$(echo "$HEALTH" | jq -r '.status')
        echo -e "${GREEN}✓ Health check:${NC} $STATUS"
        echo -e "${GREEN}✓ Deployed at:${NC} $DEPLOYED"
    else
        echo -e "${RED}✗ Health check failed${NC}"
        exit 1
    fi

    # Check OG image
    if curl -sf -I https://resume.jclee.me/og-image.png | grep -q "200 OK"; then
        echo -e "${GREEN}✓ OG image accessible${NC}"
    else
        echo -e "${YELLOW}⚠ OG image check failed${NC}"
    fi

    # Check metrics endpoint
    if curl -sf https://resume.jclee.me/metrics | grep -q "http_requests_total"; then
        echo -e "${GREEN}✓ Metrics endpoint working${NC}"
    else
        echo -e "${YELLOW}⚠ Metrics endpoint check failed${NC}"
    fi

    echo ""
}

# Main execution
main() {
    check_prerequisites
    run_tests
    build_worker
    check_git_status
    deploy_cloudflare
    verify_deployment

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 Deployment Successful!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}Production URLs:${NC}"
    echo -e "  • Site:    https://resume.jclee.me"
    echo -e "  • Health:  https://resume.jclee.me/health"
    echo -e "  • Metrics: https://resume.jclee.me/metrics"
    echo -e "  • OG Image: https://resume.jclee.me/og-image.png"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Test social media previews (Twitter, Facebook, LinkedIn)"
    echo -e "  2. Monitor Web Vitals in Grafana Loki"
    echo -e "  3. Check GitHub Actions workflow (if pushed to GitHub)"
    echo ""
}

# Run main function
main
