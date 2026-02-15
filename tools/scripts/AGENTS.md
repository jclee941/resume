# SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-01-30
**Reason:** Shared automation

## OVERVIEW

Centralized automation suite for monorepo operations, build pipelines, and infrastructure management.
Ensures consistency across PDF generation, Cloudflare deployments, and observability provisioning.

## STRUCTURE

- `build/`: Content generation (PDF, PPTX), icon processing, and image optimization.
- `deployment/`: Shipping artifacts to Cloudflare and provisioning Grafana configurations.
- `monitoring/`: Production service monitoring and deployment tracking.
- `setup/`: Bootstrapping infrastructure (GitLab CI/CD, n8n workflows).
- `utils/`: Data synchronization, versioning, and job search automation logic.
- `verification/`: Post-deployment health checks and compliance verification.

## WHERE TO LOOK

| Task                    | Location                                       | Notes                              |
| ----------------------- | ---------------------------------------------- | ---------------------------------- |
| **PDF Generation**      | `scripts/build/pdf-generator.sh`               | Main resume/doc generator          |
| **Full Deployment**     | **`scripts/deployment/quick-deploy.sh`**       | Atomic test, build, deploy, verify |
| **Grafana Sync**        | `scripts/deployment/deploy-grafana-configs.sh` | Updates dashboards/alerts via API  |
| **Resume Sync**         | `scripts/utils/sync-resume-data.js`            | Syncs master JSON to derived apps  |
| **CI/CD Setup**         | `scripts/setup/auto-setup-gitlab-cicd.sh`      | Configures LXC 101 runners         |
| **Health Verification** | `scripts/verification/verify-deployment.sh`    | Checks headers, metrics, and OG    |

## CONVENTIONS

- **Root Context**: All scripts MUST be executed from the project root.
- **Robust Bash**: Use `set -euo pipefail` and validate required environment variables.
- **Idempotency**: Check for existing resources before creation to allow safe re-runs.
- **Logging**: Use descriptive stdout for progress and detailed stderr for failures.

## ANTI-PATTERNS

- **Hardcoded Secrets**: Never embed tokens; strictly use `.env` or system env vars.
- **Bypassing Verification**: Never skip `verify-deployment.sh` after shipping changes.
- **Manual Artifact Edits**: `worker.js` and resume PDFs are artifacts; edit sources instead.
- **Absolute Paths**: Avoid machine-specific paths; use project-relative references.
