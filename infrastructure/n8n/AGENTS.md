# N8N AUTOMATION KNOWLEDGE BASE

**Generated:** 2026-03-11
**Commit:** `ee9300d`
**Branch:** `master`

## OVERVIEW

n8n workflow exports and operator setup docs for deploy hooks, health checks, alert-to-issue bridges, and Wanted/job automation.

## STRUCTURE

```text
infrastructure/n8n/
├── *.json                    # top-level workflow exports
├── workflows/                # additional workflow exports
├── README.md                 # operator guide + webhook/deploy flow
├── SLACK_OAUTH2_SETUP.md     # Slack credential setup
└── UPDATE_CREDENTIAL.md      # credential rotation notes
```

## WHERE TO LOOK

| Task                           | Location                                                                     | Notes                                  |
| ------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------- |
| End-to-end deploy webhook flow | `infrastructure/n8n/README.md`                                               | GitHub push → build/test/deploy/notify |
| Slack credential setup         | `infrastructure/n8n/SLACK_OAUTH2_SETUP.md`                                   | OAuth2 redirect/scopes                 |
| Health monitoring              | `resume-healthcheck-*.json`                                                  | scheduled checks and alerts            |
| Alert-to-issue bridges         | `grafana-github-issue-workflow.json`, `glitchtip-github-issue-workflow.json` | webhook-driven issue creation          |
| Wanted automation exports      | `wanted-*.json`                                                              | platform-specific workflow experiments |

## CONVENTIONS

- Treat exported workflow JSON as source artifacts; keep docs synchronized when node credentials, webhook paths, or external URLs change.
- Internal services (`n8n.jclee.me`, Loki, Prometheus) are assumed private; note network/VPN expectations explicitly.
- Credential references belong in n8n or secret stores, not embedded in workflow exports.
- Webhook-driven deploy flows assume `master` push semantics unless the file explicitly says otherwise.

## ANTI-PATTERNS

- Never commit live API keys, Slack tokens, webhook secrets, or credential IDs that are environment-specific.
- Never assume public reachability for internal automation hosts.
- Never update workflow JSON without checking the paired setup doc if one exists.
- Never describe an n8n workflow as authoritative production deploy logic if GitHub Actions or Cloudflare Builds now own that path.

## NOTES

- This directory is ops-heavy and partially bilingual; preserve exact provider/UI labels where operators need click-by-click accuracy.
- Some docs still describe older deploy patterns; verify ownership against current root docs and workflow files before expanding them.
