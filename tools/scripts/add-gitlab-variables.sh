#!/bin/bash
# =============================================================================
# Add GitLab CI/CD Variables via API
# =============================================================================
# Usage: ./add-gitlab-variables.sh <GITLAB_TOKEN>
#
# Required environment variables:
#   CLOUDFLARE_API_KEY    - Cloudflare API key
#   CLOUDFLARE_EMAIL      - Cloudflare account email
#   CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID
#   GITLAB_URL            - GitLab instance URL
#
# Optional environment variables:
#   PROJECT_ID    - GitLab project ID (default: root%2Fresume)
# =============================================================================

set -euo pipefail

# Capture environment variables with defaults for validation
_cf_api_key="${CLOUDFLARE_API_KEY:-}"
_cf_email="${CLOUDFLARE_EMAIL:-}"
_cf_account_id="${CLOUDFLARE_ACCOUNT_ID:-}"
_gitlab_url="${GITLAB_URL:-}"

# Validate required environment variables
if [ -z "$_cf_api_key" ] || [ -z "$_cf_email" ] || [ -z "$_cf_account_id" ]; then
  echo "Error: Required environment variables not set"
  echo "Please set: CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID"
  exit 1
fi

if [ -z "$_gitlab_url" ]; then
  echo "Error: GITLAB_URL environment variable not set"
  echo "Please set GITLAB_URL to your GitLab instance URL"
  exit 1
fi

GITLAB_TOKEN="${1:-}"
PROJECT_ID="${PROJECT_ID:-root%2Fresume}"

if [ -z "$GITLAB_TOKEN" ]; then
  echo "Error: GitLab token required"
  echo "Usage: $0 <GITLAB_TOKEN>"
  echo ""
  echo "To create a token:"
  echo "1. Go to GitLab → Profile → Access Tokens"
  echo "2. Create token with 'api' scope"
  exit 1
fi

echo "Adding CI/CD variables to GitLab..."
echo "   URL: $_gitlab_url"
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
    "$_gitlab_url/api/v4/projects/$PROJECT_ID/variables/$key" 2>/dev/null | grep -c '"key"' || echo "0")

  if [ "$exists" -gt 0 ]; then
    # Update existing variable
    echo "Updating: $key"
    curl -s -X PUT \
      --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
      --form "value=$value" \
      --form "protected=$protected" \
      --form "masked=$masked" \
      "$_gitlab_url/api/v4/projects/$PROJECT_ID/variables/$key" >/dev/null
  else
    # Create new variable
    echo "Creating: $key"
    curl -s -X POST \
      --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
      --form "key=$key" \
      --form "value=$value" \
      --form "protected=$protected" \
      --form "masked=$masked" \
      "$_gitlab_url/api/v4/projects/$PROJECT_ID/variables" >/dev/null
  fi

  if [ $? -eq 0 ]; then
    echo "   Success"
  else
    echo "   Failed"
    return 1
  fi
}

# Add CLOUDFLARE_API_KEY
echo "1/3: Adding CLOUDFLARE_API_KEY..."
add_variable "CLOUDFLARE_API_KEY" "$CLOUDFLARE_API_KEY" "true" "true"

# Add CLOUDFLARE_EMAIL
echo ""
echo "2/3: Adding CLOUDFLARE_EMAIL..."
add_variable "CLOUDFLARE_EMAIL" "$CLOUDFLARE_EMAIL" "true" "false"

# Add CLOUDFLARE_ACCOUNT_ID
echo ""
echo "3/3: Adding CLOUDFLARE_ACCOUNT_ID..."
add_variable "CLOUDFLARE_ACCOUNT_ID" "$CLOUDFLARE_ACCOUNT_ID" "true" "true"

echo ""
echo "All variables added successfully!"
echo ""
echo "Verify with:"
echo "   curl -X GET \\"
echo "     --header \"PRIVATE-TOKEN: <your-token>\" \\"
echo "     \"\$GITLAB_URL/api/v4/projects/\$PROJECT_ID/variables\""
