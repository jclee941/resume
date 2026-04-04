# INFRASTRUCTURE WORKFLOWS KNOWLEDGE BASE

**Scope:** Cloudflare Workflows configuration and deployment
**Purpose:** Event-driven workflow definitions for the resume platform

## OVERVIEW

Cloudflare Workflows provide event-driven automation for the resume platform. These JSON workflow definitions are deployed via Wrangler and integrate with n8n for orchestration.

## STRUCTURE

```text
infrastructure/workflows/
├── README.md                    # Deployment and configuration guide
├── config.template.json         # Template for workflow configuration
├── config.example.json          # Example configuration with sample values
├── 01-site-health-monitor.json  # Health check workflow (runs every 5 min)
├── 02-github-deployment-webhook.json  # GitHub deploy trigger
└── 03-weekly-job-report.json    # Weekly summary report
```

## WORKFLOWS

| Workflow            | File                                | Trigger           | Purpose                        |
| ------------------- | ----------------------------------- | ----------------- | ------------------------------ |
| Site Health Monitor | `01-site-health-monitor.json`       | Schedule (5min)   | Monitor resume.jclee.me health |
| GitHub Deployment   | `02-github-deployment-webhook.json` | Webhook           | Trigger deploy on GitHub push  |
| Weekly Job Report   | `03-weekly-job-report.json`         | Schedule (weekly) | Generate and send job stats    |

## CONVENTIONS

- **Numbered prefixes**: Workflows ordered by execution priority (01-, 02-, 03-)
- **JSON format**: All workflows valid Cloudflare Workflow JSON
- **Config injection**: Use `config.template.json` → populate → deploy
- **n8n integration**: Workflows triggered via n8n webhooks for complex orchestration

## ANTI-PATTERNS

- Never commit actual API keys or secrets in workflow JSON
- Never edit deployed workflows directly in Cloudflare dashboard (use git + wrangler)
- Never skip README update when adding new workflows

## NOTES

- See `README.md` for detailed deployment instructions
- Config values injected via `config.json` (gitignored)
- Workflows deployed via: `wrangler workflows deploy`
- Integration with `infrastructure/n8n/` for webhook callbacks
