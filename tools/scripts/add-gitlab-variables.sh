#!/bin/bash
# =============================================================================
# Add GitLab CI/CD Variables via API
# =============================================================================
# Usage: ./add-gitlab-variables.sh <GITLAB_TOKEN>
#
# This script adds Cloudflare credentials to GitLab CI/CD variables.
# =============================================================================

set -euo pipefail

GITLAB_TOKEN="${1:-}"
GITLAB_URL="${GITLAB_URL:-http://192.168.50.215:8929}"
PROJECT_ID="${PROJECT_ID:-root%2Fresume}"

if [ -z "$GITLAB_TOKEN" ]; then
  echo "❌ Error: GitLab token required"
  echo "Usage: $0 <GITLAB_TOKEN>"
  echo ""
  echo "To create a token:"
  echo "1. Go to GitLab → Profile → Access Tokens"
  echo "2. Create token with 'api' scope"
  exit 1
fi

echo "🚀 Adding CI/CD variables to GitLab..."
echo "   URL: $GITLAB_URL"
echo "   Project: root/resume"
echo ""

# Function to add or update variable
add_variable() {
  local key="$1"
  local value="$2"
  local protected="${3:-true}"
  local masked="${4:-false}"

  # Check if variable exists
  local exists
  exists=$(curl -s -X GET \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    "$GITLAB_URL/api/v4/projects/$PROJECT_ID/variables/$key" 2>/dev/null | grep -c '"key"' || echo "0")

  if [ "$exists" -gt 0 ]; then
    # Update existing variable
    echo "📝 Updating: $key"
    curl -s -X PUT \
      --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
      --form "value=$value" \
      --form "protected=$protected" \
      --form "masked=$masked" \
      "$GITLAB_URL/api/v4/projects/$PROJECT_ID/variables/$key" >/dev/null
  else
    # Create new variable
    echo "➕ Creating: $key"
    curl -s -X POST \
      --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
      --form "key=$key" \
      --form "value=$value" \
      --form "protected=$protected" \
      --form "masked=$masked" \
      "$GITLAB_URL/api/v4/projects/$PROJECT_ID/variables" >/dev/null
  fi

  if [ $? -eq 0 ]; then
    echo "   ✅ Success"
  else
    echo "   ❌ Failed"
    return 1
  fi
}

# Add CLOUDFLARE_API_KEY
echo "1/3: Adding CLOUDFLARE_API_KEY..."
add_variable "CLOUDFLARE_API_KEY" "8c5a660dfff03201090979aed72f097f8dc96" "true" "true"

# Add CLOUDFLARE_EMAIL
echo ""
echo "2/3: Adding CLOUDFLARE_EMAIL..."
add_variable "CLOUDFLARE_EMAIL" "qws941@kakao.com" "true" "false"

# Add CLOUDFLARE_ACCOUNT_ID
echo ""
echo "3/3: Adding CLOUDFLARE_ACCOUNT_ID..."
add_variable "CLOUDFLARE_ACCOUNT_ID" "a8d9c67f586acdd15eebcc65ca3aa5bb" "true" "true"

echo ""
echo "✅ All variables added successfully!"
echo ""
echo "📋 Verify with:"
echo "   curl -X GET \\"
echo "     --header \"PRIVATE-TOKEN: <your-token>\" \\"
echo "     \"$GITLAB_URL/api/v4/projects/$PROJECT_ID/variables\""
