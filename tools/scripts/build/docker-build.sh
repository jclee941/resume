#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get version from package.json
VERSION=$(node -p "require('../../package.json').version")
IMAGE_NAME="resume"
TAG="${IMAGE_NAME}:${VERSION}"
LATEST_TAG="${IMAGE_NAME}:latest"
DEV_TAG="${IMAGE_NAME}:dev"

echo -e "${GREEN}Building Docker images for Resume service${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Clean previous images
echo -e "${YELLOW}Cleaning previous images...${NC}"
docker rmi ${LATEST_TAG} ${DEV_TAG} 2>/dev/null || true

# Build production image
echo -e "${YELLOW}Building production image (${LATEST_TAG})...${NC}"
docker build \
    --tag ${TAG} \
    --tag ${LATEST_TAG} \
    --build-arg VERSION=${VERSION} \
    .

# Build development image
echo -e "${YELLOW}Building development image (${DEV_TAG})...${NC}"
docker build \
    --target builder \
    --tag ${DEV_TAG} \
    --build-arg VERSION=${VERSION} \
    .

# Create .docker.env with current version
echo -e "${YELLOW}Updating .docker.env...${NC}"
cat > .docker.env << EOF
# Docker environment variables
NODE_ENV=production
PORT=3000

# Version (auto-populated from package.json)
npm_package_version=${VERSION}

# Add any additional environment variables here
# API_ENDPOINTS=...
EOF

echo
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${YELLOW}Images created:${NC}"
echo "  - ${TAG}"
echo "  - ${LATEST_TAG}"
echo "  - ${DEV_TAG}"
echo
echo -e "${YELLOW}To run:${NC}"
echo "  Production:  npm run docker:run"
echo "  Development:  npm run docker:run:dev"
echo "  Docker Compose:  npm run docker:compose"