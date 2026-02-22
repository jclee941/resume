# Slack Integration Guide

## Overview

The resume portfolio now includes Slack notifications for deployment events via GitHub Actions.

## Features

### Deployment Notifications

- ✅ Success/failure status
- 📝 Commit information (SHA, author, message)
- 🔗 Direct links to live site and workflow
- 🎨 Rich formatting with Slack Block Kit

## Setup

### 1. Create Slack Incoming Webhook

1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Click **Add to Slack**
4. Choose a channel (e.g., `#deployments`)
5. Copy the Webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### 2. Add Secret to GitHub

1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `SLACK_WEBHOOK_URL`
4. Value: Paste your webhook URL
5. Click **Add secret**

### 3. Test the Integration

```bash
# Trigger deployment by pushing to master
git add .
git commit -m "test: Trigger Slack notification"
git push origin master
```

Check your Slack channel for the deployment notification!

## Notification Format

The Slack message includes:

```
🚀 Resume Portfolio Deployment

Status: ✅ Success
Branch: master
Commit: a1b2c3d
Author: Jaecheol Lee

Commit Message:
```

feat: Add Slack integration for deployments

```

[View Live Site] [View Workflow]
```

## Workflow Structure

```yaml
jobs:
  deploy-worker:
    # ... deploys to Cloudflare

  generate-deployment-notes:
    needs: deploy-worker
    # ... generates Gemini summary

  notify-slack:
    needs: [deploy-worker, generate-deployment-notes]
    if: always() # Runs even if previous jobs fail
    # ... sends Slack notification
```

## Customization

### Change Notification Channel

Modify the webhook URL to point to a different channel.

### Add More Information

Edit `.github/workflows/ci.yml` and add fields to the `slack_payload.json`:

```json
{
  "type": "section",
  "fields": [
    {
      "type": "mrkdwn",
      "text": "*New Field:*\nYour value"
    }
  ]
}
```

### Conditional Notifications

Only notify on failures:

```yaml
- name: Send Slack notification
  if: failure() # Only runs if deployment failed
```

## Troubleshooting

### Notification not sent

1. **Check if webhook URL is set**
   - GitHub repo → Settings → Secrets → `SLACK_WEBHOOK_URL` should exist

2. **Verify webhook condition**
   - Current condition: `if: vars.SLACK_WEBHOOK_URL != ''`
   - Should be: `if: secrets.SLACK_WEBHOOK_URL != ''` (for secrets)

3. **Check workflow logs**
   - GitHub Actions → Latest workflow run → `notify-slack` job

### Invalid payload error

- Verify JSON syntax in `slack_payload.json`
- Test locally: `curl -X POST -H 'Content-type: application/json' --data @slack_payload.json YOUR_WEBHOOK_URL`

## Security Notes

- ⚠️ Never commit webhook URLs to git
- ✅ Always use GitHub Secrets
- 🔒 Webhook URLs grant posting access to your channel
- 🔄 Rotate webhook URLs if compromised

## References

- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
