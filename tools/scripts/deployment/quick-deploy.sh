#!/bin/bash
# Resume Portfolio - Quick Deploy Script
# One-command deployment with all checks

set -euo pipefail

PROJECT_ROOT="/home/jclee/dev/resume"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Resume Portfolio - Quick Deploy      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check authentication (supports both API Token and Global API Key)
if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo -e "${GREEN}✓ Authentication: API Token (recommended)${NC}"
    AUTH_METHOD="API Token"
elif [[ -n "${CLOUDFLARE_API_KEY:-}" && -n "${CLOUDFLARE_EMAIL:-}" ]]; then
    echo -e "${GREEN}✓ Authentication: Global API Key${NC}"
    AUTH_METHOD="Global API Key"
else
    echo -e "${RED}✗ No Cloudflare authentication configured${NC}"
    echo ""
    echo -e "${YELLOW}Quick Setup Options:${NC}"
    echo ""
    echo -e "Option 1: API Token (⭐ Recommended)"
    echo -e "  export CLOUDFLARE_API_TOKEN=your_token_here"
    echo -e "  $0"
    echo ""
    echo -e "Option 2: Global API Key"
    echo -e "  export CLOUDFLARE_API_KEY=your_key_here"
    echo -e "  export CLOUDFLARE_EMAIL=your@email.com"
    echo -e "  $0"
    echo ""
    echo -e "Option 3: Interactive login (opens browser)"
    echo -e "  cd typescript/portfolio-worker && npx wrangler login"
    echo ""
    echo -e "${BLUE}→ See detailed guide: docs/CLOUDFLARE_AUTH_METHODS.md${NC}"
    echo -e "${BLUE}→ See token guide: docs/GET_CLOUDFLARE_API_TOKEN.md${NC}"
    echo ""
    exit 1
fi

echo ""

# Run deployment helper
if ./scripts/deployment/deploy-helper.sh; then
    echo -e "${GREEN}✓ Deployment completed${NC}"
    echo ""

    # Run verification
    echo -e "${BLUE}Running deployment verification...${NC}"
    echo ""
    ./scripts/verification/verify-deployment.sh
else
    echo -e "${RED}✗ Deployment failed${NC}"
    echo -e "${YELLOW}→ Check logs: ~/.config/.wrangler/logs/${NC}"
    echo -e "${YELLOW}→ See troubleshooting: docs/MANUAL_DEPLOYMENT_GUIDE.md${NC}"
    exit 1
fi
