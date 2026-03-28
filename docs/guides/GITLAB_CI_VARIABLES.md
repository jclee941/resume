# GitLab CI/CD Variables Template

#

# Copy these values to your GitLab project:

# Project → Settings → CI/CD → Variables (Expand) → Add variable

#

# Source: 1Password vault "homelab"

## GitLab Instance Configuration

# Type: Variable

# Name: GITLAB_URL

# Value: http://gitlab.jclee.me

## OAuth Credentials (from 1Password: homelab/gitlab-oauth)

# Type: Variable

# Name: GITLAB_OAUTH_APP_ID

# Value: <from 1Password op://homelab/gitlab-oauth/application-id>

# Type: Variable (Masked)

# Name: GITLAB_OAUTH_CLIENT_SECRET

# Value: <from 1Password op://homelab/gitlab-oauth/client-secret>

## 1Password Service Account (optional - for dynamic secret fetching)

# Type: Variable (Masked)

# Name: OP_SERVICE_ACCOUNT_TOKEN

# Value: <1Password service account token>

## Telegram Notifications (optional)

# Type: Variable (Masked)

# Name: TELEGRAM_BOT_TOKEN

# Value: <Telegram bot token>

# Type: Variable

# Name: TELEGRAM_CHAT_ID

# Value: <Telegram chat ID>

## Cloudflare Deployment (if deploying from GitLab)

# Type: Variable (Masked)

# Name: CLOUDFLARE_API_TOKEN

# Value: <Cloudflare API token>

# Type: Variable

# Name: CLOUDFLARE_ACCOUNT_ID

# Value: <Cloudflare account ID>
