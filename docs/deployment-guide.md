# Resume Monorepo Deployment Guide (v2.0)

Welcome to the **Resume Monorepo** project. This guide provides comprehensive instructions for setting up your environment, understanding the architecture, and deploying the applications to production. It is designed for new developers joining the team to ensure a smooth onboarding and consistent deployment process.

---

## 1. Prerequisites

Before starting, ensure your local development environment meets the following requirements. Following these strictly will prevent common build and runtime errors.

### 1.1 Node.js and Package Management

- **Node.js**: >= 22.0.0. This project utilizes modern JavaScript features like ESM modules and Node-compatible APIs in Cloudflare Workers. It is recommended to use `nvm` (Node Version Manager) to switch between versions easily.
- **npm**: Standard versions that come with Node.js 22. We use **npm workspaces** to manage multiple sub-projects within a single repository, allowing for shared `node_modules` and easy cross-project linking.
- **Wrangler CLI**: Install it globally using `npm install -g wrangler` or use `npx wrangler`. This is the official tool for developing, testing, and deploying Cloudflare Workers. Make sure to authenticate using `npx wrangler login`.

### 1.2 Version Control and System Tools

- **Git**: Required for repository management and CI/CD triggers. All commits must follow the conventional commits specification to ensure proper versioning.
- **GitHub CLI (gh)**: Highly recommended for managing Pull Requests, viewing CI/CD logs from the terminal, and managing GitHub Secrets.
- **Bazel (Optional)**: In this monorepo, Bazel serves as a high-level build coordinator. While you can run most tasks via `npm`, Bazel ensures hermetic builds and handles complex dependencies across workspaces. It is particularly useful for large-scale builds or when running tests in a distributed environment.
- **OpenSSL**: Required for generating encryption keys for session management and creating self-signed certificates for local testing if needed.
- **JQ**: A lightweight and flexible command-line JSON processor. It is used extensively in our shell scripts for parsing configuration files and API responses.

### 1.3 Cloudflare Account

- You must have a Cloudflare account with the **Workers Paid plan** ($5/mo). This is mandatory because the project uses:
  - **Cloudflare Workflows**: For scheduled background tasks.
  - **Durable Objects**: For stateful browser session management.
  - **D1 Databases**: For relational data storage.

---

## 2. Architecture Overview

The project is structured as a **Google3-style monorepo**, emphasizing a **Single Source of Truth (SSoT)** and modularity.

### 2.1 Core Components

- **Portfolio Worker** (`typescript/portfolio-worker/`):
  - Domain: `resume.jclee.me`
  - Function: Serves a high-performance, edge-deployed portfolio with a cyberpunk terminal UI. It inlines all assets (CSS, JS, JSON) at build time for zero-latency delivery.
- **Job Dashboard Worker** (`typescript/job-automation/workers/`):
  - Domain: `resume.jclee.me/job/*`
  - Function: A full-stack mini-app managing job applications, automation status, and analytics. It interfaces with D1, KV, and R2.
- **Unified Routing**:
  - Implementation: `typescript/portfolio-worker/entry.js`
  - Routing Logic: Any request starting with `/job/` is dispatched to the Job Dashboard. All other requests are handled by the Portfolio Worker.

### 2.2 SSoT: Single Source of Truth

All resume data is managed in a single JSON file:
`typescript/data/resumes/master/resume_data.json`

This file is synced to various platforms and inlined into the portfolio. **NEVER** edit the generated `data.json` or `worker.js` files directly.

### 2.3 Build Pipeline Flow

The deployment process follows a strict unidirectional data flow:

1. **Data Update**: Modify `resume_data.json`.
2. **Sync**: Run `npm run sync:data`. This propagates the JSON to `typescript/portfolio-worker/data.json`.
3. **Generation**: `node generate-worker.js` runs. It:
   - Reads `index.html`.
   - Inlines all modular CSS from `src/styles/`.
   - Computes SHA-256 hashes for all inline scripts to build a strict Content Security Policy (CSP).
   - Escapes backticks for injection into a template literal.
4. **Artifact Creation**: `worker.js` is created as a single self-contained script.
5. **Deployment**: `npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production` uploads the artifact to the Cloudflare network.

### 2.4 Architecture Diagram

```text
                                 [ User / Browser ]
                                         |
                                         v
                            [ resume.jclee.me (DNS) ]
                                         |
                                         v
                          +-----------------------------+
                          |      Portfolio Worker       |
                          | (typescript/portfolio-worker)|
                          +--------------+--------------+
                                         |
                +------------------------+------------------------+
                |                                                 |
         [ / (Portfolio) ]                              [ /job/* (Dashboard) ]
                |                                                 |
                v                                                 v
      +-------------------+                           +-------------------------+
      |  portfolioWorker  |                           |       jobHandler        |
      |   (Vanilla JS)    |                           | (Fastify-like / Class)  |
      +---------+---------+                           +------------+------------+
                |                                                  |
                |                                       +----------+----------+
                |                                       |                     |
      +---------v---------+                    +--------v--------+   +--------v--------+
      |   data.json       |                    |   D1 Database   |   |  KV Namespace   |
      | (SSoT Snapshot)   |                    | (Applications)  |   |    (Sessions)   |
      +-------------------+                    +-----------------+   +-----------------+
                ^                                       ^                     ^
                |                                       |                     |
                +------------------ [ Workflows / Schedules ] ------------------+
```

### 2.5 Job Automation Crawlers

The `job-automation` workspace includes specialized crawlers for various job platforms. Understanding these is key for debugging application issues:

- **Wanted**: API-based crawler (Direct JSON fetch). Most stable.
- **JobKorea**: Puppeteer-based with stealth plugins.
- **Saramin**: Puppeteer-based with stealth plugins.
- **LinkedIn**: Fetch-based with regex parsing for "Easy Apply".
- **Remember**: Browser-based crawler for social recruiting.

Each crawler implements the `BaseCrawler` class, which handles User-Agent rotation, request jitter, and automatic retries to avoid bot detection.

---

## 3. Environment Setup

Proper environment configuration is the most critical step for new developers.

### 3.1 Local Repository Setup

1. Clone the repo: `git clone https://github.com/qws941/resume.git`
2. Install dependencies: `npm install` (this installs for all 5 workspaces).
3. Copy the template: `cp .env.example .env`.

### 3.2 The .env File Structure

Your `.env` file contains 6 primary sections:

- **General**: Environment type (`NODE_ENV`) and logging verbosity.
- **Cloudflare Credentials**: Used by the CLI and CI/CD to authenticate.
- **Job Dashboard Secrets**: Critical for HMAC verification and session encryption.
- **Portfolio Secrets**: Signing secrets for security headers and analytics.
- **Observability**: Connection strings for Elasticsearch and Loki.
- **Platform Secrets**: API keys for external integrations (Slack, n8n, etc.).

### 3.3 Wrangler Configuration

The monorepo uses two active Wrangler configuration files:

1. `typescript/portfolio-worker/wrangler.toml`: Uses TOML format for the main site.
2. `typescript/job-automation/workers/wrangler.toml`: Uses TOML format for the dashboard worker.

### 3.4 Managing Production Secrets

Secrets are **not** stored in git. You must push them to Cloudflare using the CLI:

```bash
# Example: Setting the admin token for the dashboard
npx wrangler secret put ADMIN_TOKEN --config typescript/job-automation/workers/wrangler.toml
```

**Detailed Secret Descriptions:**

| Secret Name             | Purpose                                                                    | Example / Generation          |
| ----------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| `ADMIN_TOKEN`           | Bearer token for accessing protected dashboard API endpoints.              | `openssl rand -hex 32`        |
| `WEBHOOK_SECRET`        | HMAC secret for verifying that incoming webhooks are from trusted sources. | `openssl rand -hex 32`        |
| `AUTH_SYNC_SECRET`      | Used by external auth-sync scripts to securely push cookies to the worker. | `openssl rand -hex 32`        |
| `ENCRYPTION_KEY`        | AES-256 key used to encrypt user session data stored in cookies.           | `openssl rand -base64 32`     |
| `SIGNING_SECRET`        | Used to sign JWTs or secure cookies in the portfolio worker.               | `openssl rand -hex 32`        |
| `SLACK_WEBHOOK_URL`     | Incoming webhook URL for the designated Slack channel.                     | `https://hooks.slack.com/...` |
| `LOKI_API_KEY`          | Authentication key for pushing logs to Grafana Loki.                       | Provided by Grafana Cloud     |
| `ELASTICSEARCH_API_KEY` | Key for authenticating with the Elasticsearch log storage.                 | Provided by Elastic Cloud     |
| `CF_API_KEY`            | Global Cloudflare API Key (use sparingly, prefer Tokens).                  | Cloudflare Profile Settings   |

### 3.5 Cloudflare Bindings

Ensure your Cloudflare account has the following resources created and bound to the worker environments. These IDs are referenced in the worker `wrangler.toml` files.

**D1 Relational Databases:**

- **`DB`** (ID: `6c723024...`): Stores main portfolio data, visitor logs, and basic metadata.
- **`JOB_DB`** (ID: `c858dda6...`): Stores the `applications`, `job_cache`, and `sync_logs` tables.

**KV Distributed Storage:**

- **`SESSIONS`**: Stores platform-specific session objects (e.g., `session:wanted`) with a 24h TTL.
- **`RATE_LIMIT_KV`**: Used by the rate-limiting middleware to track request counts per IP.
- **`NONCE_KV`**: Stores cryptographic nonces for CSRF protection.

**Workflows Engine:**
The dashboard worker exports several workflow classes that must be bound to their respective names in the Cloudflare dashboard:

- `JobCrawlingWorkflow`: Orchestrates multi-platform job fetching.
- `ApplicationWorkflow`: Handles the multi-step form submission process.
- `ResumeSyncWorkflow`: Synchronizes the master resume data across various job boards.
- `DailyReportWorkflow`: Generates the daily PDF/HTML activity summary.
- `HealthCheckWorkflow`: Monitors database and API availability.
- `BackupWorkflow`: Performs automated daily snapshots of D1 to KV.
- `CleanupWorkflow`: Purges stale records and temporary files.

---

## 4. Local Development Workflow

### 4.1 Running the Portfolio Locally

To preview the main portfolio site:

```bash
cd typescript/portfolio-worker
npx wrangler dev
```

The site will be available at `http://localhost:8787`.

### 4.2 Running the Job Dashboard Locally

To develop the dashboard and API:

```bash
cd typescript/job-automation/workers
npx wrangler dev
```

Note: Local development uses a local SQLite version of D1 by default.

### 4.3 Data Synchronization (SSoT)

If you change the content in `typescript/data/resumes/master/resume_data.json`, you must run:

```bash
npm run sync:data
```

This script validates the JSON schema and updates the snapshots used by the workers.

### 4.4 Build and Verify

Always build the full project before committing:

```bash
npm run build:all   # Executes full build pipeline
npm run lint        # Checks code style
npm run test:unit   # Runs Jest tests
```

---

## 5. Staging and Preview Deployment

### 5.1 Automatic PR Previews

When you open a Pull Request, GitHub Actions triggers a `deploy-preview` job.

- **URL**: `https://resume-pr-{PR_NUMBER}.jclee.workers.dev`
- **Behavior**: This is an ephemeral worker used for visual inspection and E2E testing.
- **Cleanup**: The preview is automatically deleted when the PR is merged or closed.

---

## 6. Production Deployment

### 6.1 Standard Deployment Process

Production deployment is orchestrated by the `npm run deploy` command. This is a high-level script that performs a safe deployment:

1. Increments the patch version (`1.0.x`).
2. Builds all assets and generates the final `worker.js`.
3. Invokes the custom Deployment CLI to push to Cloudflare.

### 6.2 CI/CD Pipeline Breakdown

Our GitHub Actions pipeline (`ci.yml`) is a 13-job dependency chain ensuring zero-downtime and high reliability. Every push to the `master` branch or Pull Request triggers this flow:

1. **Analyze**:
   - Uses `tools/ci/affected.sh` to compare the current branch against `master`.
   - Determines which workspaces (Portfolio, Job Automation, Infra) need to be tested or built.
   - Saves time by skipping unaffected targets.
2. **Lint**:
   - Runs `eslint .` using the project's flat configuration.
   - Enforces a zero-error policy and a warning baseline ratchet.
3. **Typecheck**:
   - Executes `tsc` to validate TypeScript types across the monorepo.
   - Ensures consistency between shared logic and worker implementations.
4. **Test-Unit**:
   - Runs Jest unit tests for the `job-automation` core services.
   - Generates coverage reports (Artifact: `coverage-report`).
5. **Test-E2E**:
   - Initializes a local environment, syncs data, and builds the worker.
   - Runs Playwright tests against the generated `worker.js`.
   - Uploads a graphical report on failure (Artifact: `playwright-report`).
6. **Security-Scan**:
   - Runs `gitleaks` to detect accidentally committed secrets or API keys.
   - Executes `npm audit` to identify vulnerable dependencies.
7. **Build**:
   - The primary artifact generation job. Runs `node generate-worker.js`.
   - Produces the production-ready `worker.js` (Artifact: `portfolio-worker`).
8. **Deploy**:
   - Uses `cloudflare/wrangler-action` to push the worker to the `production` environment.
   - Creates a GitHub Deployment entry for tracking.
9. **Verify**:
   - Primary: Checks the Cloudflare API for the deployment age.
   - Secondary: Pings `https://resume.jclee.me/health` for a 200 OK status.
   - Checks for the presence of mandatory security headers (CSP, HSTS).
10. **Rollback**:
    - A critical safety job that only runs if the **Verify** job fails.
    - Executes `npx wrangler rollback` to restore the previous stable version.
11. **Notify**:
    - Dispatches a webhook to N8N and Slack with the deployment outcome.
    - Includes commit messages, actor names, and environment URLs.
12. **Deploy-Preview**:
    - (PR Only) Deploys an ephemeral worker for manual review.
13. **Cleanup-Preview**:
    - (PR Only) Deletes the ephemeral worker once the PR is closed or merged.

### 6.3 Automated Maintenance (Schedules)

The worker includes 5 scheduled workflow triggers for operational tasks:

- `*/5 * * * *`: **Health Check** - Pings all dependencies and logs uptime.
- `0 0 * * 1-5`: **Auth Refresh** - Rotates platform session cookies.
- `0 9 * * *`: **Daily Report** - Aggregates stats and sends a Slack summary.
- `0 3 * * *`: **Backup** - Syncs D1 database state to KV for redundancy.
- `0 4 * * SUN`: **Cleanup** - Purges expired job caches and old logs.

---

## 7. Troubleshooting

### 7.1 Common Issues and Fixes

- **CSP Hash Mismatch**:
  - _Symptom_: Browser console shows "Refused to execute script because it violates CSP".
  - _Fix_: You edited HTML or JS but didn't rebuild. Run `node generate-worker.js`.
- **D1 Binding Error**:
  - _Symptom_: Worker returns 500 error with "DB not found".
  - _Fix_: Check `wrangler.toml` database IDs. Ensure you are logged into Wrangler (`npx wrangler login`).
- **Secret Not Set**:
  - _Symptom_: Dashboard login fails or redirects indefinitely.
  - _Fix_: Ensure `SIGNING_SECRET` and `ENCRYPTION_KEY` are pushed to production.
- **Wrangler Login Issues**:
  - _Symptom_: Deploy fails with authentication error.
  - _Fix_: Run `rm -rf ~/.wrangler` and re-authenticate with `npx wrangler login`.
- **Missing entry-point to Worker script**:
  - _Symptom_: `npx wrangler deploy` fails from repo root with entry-point error.
  - _Fix_: Use explicit config path: `npx wrangler deploy --config typescript/portfolio-worker/wrangler.toml --env production`.

---

## 8. Useful Commands Reference

| Command                        | Workspace | Description                                               |
| ------------------------------ | --------- | --------------------------------------------------------- |
| `npm run sync:data`            | Root      | Propagates SSoT to data snapshots                         |
| `npm run build:all`            | Root      | Full build (Data Sync + Generation)                       |
| `npm run deploy`               | Root      | Full production release cycle                             |
| `npm run test:unit`            | Root      | Run all Jest unit tests                                   |
| `npm run test:e2e`             | Root      | Run Playwright browser tests                              |
| `npm run lint`                 | Root      | Lint entire codebase                                      |
| `npx wrangler dev`             | -         | Start local development worker                            |
| `npm run deploy:wrangler:root` | Root      | Root-safe production deploy with explicit wrangler config |
| `npx wrangler tail`            | -         | Stream live logs from production                          |
| `npx wrangler rollback`        | -         | Revert to previous production version                     |
| `bazel build //...`            | Root      | Google3-style full workspace build                        |

---

**Last Updated**: February 2026  
**Version**: v1.0.128  
**Maintained by**: Jaecheol Lee (qws941)

---

## 9. Security Best Practices

To maintain the integrity and security of the deployment pipeline, follow these guidelines:

1. **Never commit `.env` files**: The `.gitignore` file should always include `.env`. Use `.env.example` as a template for other developers.
2. **Rotate Secrets Regularly**: Use the `npx wrangler secret put` command to rotate sensitive keys like `ADMIN_TOKEN` and `ENCRYPTION_KEY` at least once every quarter.
3. **Audit Dependencies**: Run `npm audit` frequently to check for vulnerabilities in the workspaces. The CI pipeline will automatically block deployments if high-severity vulnerabilities are found.
4. **Strict CSP**: The `generate-worker.js` script automatically generates SHA-256 hashes for inline scripts. Avoid adding external script sources unless absolutely necessary, and always update the CSP policy in `security-headers.js`.
5. **Least Privilege**: Ensure the Cloudflare API token used for deployment has the minimum required permissions (Workers, D1, KV, and Workflows access only).

## 10. Advanced Troubleshooting

### 10.1 Analyzing Worker Logs

If you encounter a runtime error that isn't caught by the health check, use the tail command to stream live logs:

```bash
npx wrangler tail --env production
```

Look for `Uncaught Error` or `Worker exceeded resource limits`.

### 10.2 Database Migration Failures

If a D1 migration fails during deployment:

1. Check the migration status: `npx wrangler d1 migrations list job-dashboard-db`
2. Manually apply the missing migration: `npx wrangler d1 execute job-dashboard-db --file=migrations/XXXX.sql`

### 10.3 CI/CD Pipeline Stalls

If the "Analyze" job in GitHub Actions takes too long or fails:

- Ensure `affected.sh` has execution permissions (`chmod +x tools/ci/affected.sh`).
- Check if the git history is shallow; the job needs a full checkout to compare against `master`.

---
