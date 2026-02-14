#!/bin/bash
# ⚠️ DEPRECATED — This script is no longer maintained.
# Use quick-deploy.sh instead, which includes auth validation and post-deploy verification.
#
# This wrapper exists to prevent accidental use of the old deploy flow.

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ⚠️  DEPRECATED: deploy.sh is no longer maintained${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}This script had hardcoded paths and insecure credential handling.${NC}"
echo -e "${YELLOW}Use the replacement instead:${NC}"
echo ""
echo -e "  ${YELLOW}./tools/scripts/deployment/quick-deploy.sh${NC}"
echo ""
echo -e "${YELLOW}Or deploy via CI/CD by pushing to master.${NC}"
echo ""

# Forward to quick-deploy.sh if --force flag is passed
if [[ "${1:-}" == "--force" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    exec "$SCRIPT_DIR/quick-deploy.sh"
fi

exit 1
echo -e "${YELLOW}This script had hardcoded paths and insecure credential handling.${NC}"
echo -e "${YELLOW}Use the replacement instead:${NC}"
echo ""
echo -e "  ${YELLOW}./tools/scripts/deployment/quick-deploy.sh${NC}"
echo ""
echo -e "${YELLOW}Or deploy via CI/CD by pushing to master.${NC}"
echo ""

# Forward to quick-deploy.sh if --force flag is passed
if [[ "${1:-}" == "--force" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    exec "$SCRIPT_DIR/quick-deploy.sh"
fi

exit 1
