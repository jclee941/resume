#!/bin/bash
# Deploy resume portfolio with real-time monitoring via tmux

set -euo pipefail

SESSION_NAME="resume-deploy"
WINDOW_NAME="main"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Resume Portfolio Deployment${NC}"
echo -e "${BLUE}📺 Creating tmux session: ${SESSION_NAME}${NC}"

# Check if session already exists
if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    echo -e "${BLUE}♻️  Session already exists, killing...${NC}"
    tmux kill-session -t "${SESSION_NAME}"
fi

# Create new tmux session in detached mode
tmux new-session -d -s "${SESSION_NAME}" -n "${WINDOW_NAME}"

# Set unlimited scrollback for deployment logs
tmux set-option -t "${SESSION_NAME}" history-limit 50000

echo -e "${GREEN}✅ Tmux session created${NC}"
echo ""
echo -e "${BLUE}📝 Deployment Steps:${NC}"
echo "  1. Building worker.js"
echo "  2. Running tests"
echo "  3. Deploying to Cloudflare"
echo "  4. Verifying deployment"
echo ""

# Step 1: Build
echo -e "${BLUE}[1/4] Building worker.js...${NC}"
tmux send-keys -t "${SESSION_NAME}:${WINDOW_NAME}" "cd ${PROJECT_ROOT} && npm run build" C-m

# Wait for build to complete
sleep 2
BUILD_OUTPUT=$(tmux capture-pane -t "${SESSION_NAME}:${WINDOW_NAME}" -p | tail -5)
if echo "$BUILD_OUTPUT" | grep -q "generated successfully"; then
    echo -e "${GREEN}✅ Build completed${NC}"
else
    echo -e "${RED}❌ Build may have failed, check session${NC}"
fi

# Step 2: Tests
echo -e "${BLUE}[2/4] Running tests...${NC}"
tmux send-keys -t "${SESSION_NAME}:${WINDOW_NAME}" "npm test" C-m

sleep 3
TEST_OUTPUT=$(tmux capture-pane -t "${SESSION_NAME}:${WINDOW_NAME}" -p | tail -10)
if echo "$TEST_OUTPUT" | grep -q "Tests:.*passed"; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${RED}❌ Tests may have failed, check session${NC}"
fi

# Step 3: Deploy
echo -e "${BLUE}[3/4] Deploying to Cloudflare Workers...${NC}"
tmux send-keys -t "${SESSION_NAME}:${WINDOW_NAME}" "cd ${PROJECT_ROOT} && npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production" C-m

sleep 5
DEPLOY_OUTPUT=$(tmux capture-pane -t "${SESSION_NAME}:${WINDOW_NAME}" -p | tail -10)
if echo "$DEPLOY_OUTPUT" | grep -qE "(Published|Deployed|Success)"; then
    echo -e "${GREEN}✅ Deployment completed${NC}"
else
    echo -e "${RED}❌ Deployment may have failed, check session${NC}"
fi

# Step 4: Verify
echo -e "${BLUE}[4/4] Verifying deployment...${NC}"
tmux send-keys -t "${SESSION_NAME}:${WINDOW_NAME}" "curl -I https://resume.jclee.me" C-m

sleep 2
VERIFY_OUTPUT=$(tmux capture-pane -t "${SESSION_NAME}:${WINDOW_NAME}" -p | tail -5)
if echo "$VERIFY_OUTPUT" | grep -q "HTTP.*200"; then
    echo -e "${GREEN}✅ Deployment verified (HTTP 200)${NC}"
else
    echo -e "${RED}❌ Verification failed, check session${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment process completed!${NC}"
echo ""
echo -e "${BLUE}📺 View session:${NC}"
echo "   tmux attach -t ${SESSION_NAME}"
echo ""
echo -e "${BLUE}📊 Stream logs:${NC}"
echo "   tmux capture-pane -t ${SESSION_NAME} -p"
echo ""
echo -e "${BLUE}🔚 Kill session:${NC}"
echo "   tmux kill-session -t ${SESSION_NAME}"
