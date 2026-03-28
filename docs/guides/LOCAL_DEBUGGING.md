# 🔧 Local CI/CD Debugging Guide

> Comprehensive guide to the local debugging infrastructure for the resume monorepo.

## 📋 Overview

This project includes a suite of local debugging tools that let you simulate the full CI pipeline, run development services, and mock external dependencies — all without pushing to GitHub or depending on remote infrastructure.

**Why local debugging?**

- **Faster feedback loops** — catch CI failures in seconds, not minutes
- **Offline development** — no dependency on GitHub Actions, n8n, or Cloudflare
- **Deterministic testing** — mock external services with predictable behavior
- **Debugging isolation** — reproduce and fix issues without polluting CI history

### Tool inventory

| Tool                  | Location                | Purpose                           |
| --------------------- | ----------------------- | --------------------------------- |
| `run-ci-local.go`     | `tools/scripts/`        | Simulate CI pipeline locally      |
| `local-dev-up.go`     | `tools/scripts/`        | Orchestrate local dev environment |
| `n8n-mock-server.go`  | `infrastructure/mocks/` | Mock n8n webhook server           |
| `cf-bindings-mock.js` | `infrastructure/mocks/` | Mock Cloudflare Worker bindings   |

---

## 🚀 Quick Start

```bash
# See all CI simulation options
go run tools/scripts/run-ci-local.go --help

# Start full local dev environment (portfolio + job-server + n8n mock)
go run tools/scripts/local-dev-up.go --all

# Start n8n mock server standalone
go run infrastructure/mocks/n8n-mock-server.go
```

---

## 📖 Tools Reference

### `run-ci-local.go` — CI Pipeline Simulator

Simulates the full GitHub Actions CI pipeline locally by parsing `.github/workflows/ci.yml`, mapping workflow jobs to local commands, and executing them in the correct stage order.

#### Usage

```bash
# Run full pipeline (all 8 stages)
go run tools/scripts/run-ci-local.go

# Run specific stage(s)
go run tools/scripts/run-ci-local.go --stage lint
go run tools/scripts/run-ci-local.go --stage lint,typecheck,test

# Dry run — see what would execute without running
go run tools/scripts/run-ci-local.go --dry-run

# Mock mode — inject mock service environment variables
go run tools/scripts/run-ci-local.go --mock

# Combine flags
go run tools/scripts/run-ci-local.go --stage test,build --mock --dry-run
```

#### Flags

| Flag        | Default | Description                                                                                                               |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--stage`   | _(all)_ | Comma-separated stage names to run: `analyze`, `validate`, `lint`, `typecheck`, `data-drift`, `test`, `security`, `build` |
| `--dry-run` | `false` | Print commands without executing                                                                                          |
| `--mock`    | `false` | Set mock environment variables (`CI_LOCAL_MOCK=1`, `MOCK_SERVICES=1`, `USE_MOCK_SERVICES=true`)                           |

#### Stage execution order

Stages execute in this fixed order (matching CI dependency graph):

1. `analyze` → `validate` → `lint` → `typecheck` → `data-drift` → `test` → `security` → `build`

#### Environment variables injected

All commands run with:

- `CI=true` — signals CI mode to test frameworks
- `LOCAL_CI_SIMULATION=1` — distinguishes from real CI

With `--mock`:

- `CI_LOCAL_MOCK=1`
- `MOCK_SERVICES=1`
- `USE_MOCK_SERVICES=true`

#### Exit codes

| Code | Meaning                   |
| ---- | ------------------------- |
| `0`  | All stages passed         |
| `1`  | One or more stages failed |

#### Report output

Each run generates a timestamped report at `.ci-local/ci-report-YYYYMMDD-HHMMSS.txt` containing:

- Timestamp, repository path, workflow file
- Per-stage results with command-level pass/fail and durations
- Summary: passed/failed/skipped counts and total duration

---

### `local-dev-up.go` — Local Dev Environment Orchestrator

Starts, health-checks, and manages multiple local development services with aggregated log output and graceful shutdown.

#### Usage

```bash
# Start all services (portfolio + job-server + n8n mock)
go run tools/scripts/local-dev-up.go --all

# Start only n8n mock (default: enabled)
go run tools/scripts/local-dev-up.go

# Start portfolio dev server + n8n mock
go run tools/scripts/local-dev-up.go --portfolio

# Start specific combination
go run tools/scripts/local-dev-up.go --portfolio --job-server

# Disable n8n mock (enabled by default)
go run tools/scripts/local-dev-up.go --portfolio --n8n=false
```

#### Service flags

| Flag           | Default | Description                                                     |
| -------------- | ------- | --------------------------------------------------------------- |
| `--portfolio`  | `false` | Start portfolio dev server (`npm run dev` in `apps/portfolio/`) |
| `--job-server` | `false` | Start job-server via docker-compose (`apps/job-server/`)        |
| `--n8n`        | `true`  | Start n8n mock server                                           |
| `--all`        | `false` | Enable all services                                             |

#### Service details

| Service    | URL                      | Health Endpoint | Health Timeout | Command                                                       |
| ---------- | ------------------------ | --------------- | -------------- | ------------------------------------------------------------- |
| n8n-mock   | `http://localhost:15678` | `/health`       | 25s            | `go run infrastructure/mocks/n8n-mock-server.go --port 15678` |
| portfolio  | `http://localhost:8787`  | `/`             | 40s            | `npm run dev` (in `apps/portfolio/`)                          |
| job-server | `http://localhost:3456`  | `/health`       | 90s            | `docker-compose up` (in `apps/job-server/`)                   |

#### Features

- **Parallel startup** — all services start concurrently with spinner indicators
- **Health check polling** — each service is polled until healthy or timeout
- **Aggregated logs** — color-coded, prefixed log streams from all services
- **Graceful shutdown** — `Ctrl+C` sends `SIGINT` to process groups, then `SIGKILL` after 10s timeout
- **Unexpected exit handling** — detects early service exits and reports errors

#### Prerequisites

- **portfolio**: Node.js installed, `npm ci` run
- **job-server**: `docker-compose` or `docker compose` available in PATH
- **n8n-mock**: Go installed (compiles on the fly)

---

### `n8n-mock-server.go` — Mock n8n Webhook Server

A lightweight HTTP server that mimics n8n webhook endpoints, logging all received payloads to JSON files for inspection.

#### Usage

```bash
# Start with defaults (port 15678, logs to infrastructure/mocks/logs/)
go run infrastructure/mocks/n8n-mock-server.go

# Custom port
go run infrastructure/mocks/n8n-mock-server.go --port 9999

# Custom log directory
go run infrastructure/mocks/n8n-mock-server.go --log-dir /tmp/n8n-logs

# Verbose mode (log full request bodies to stdout)
go run infrastructure/mocks/n8n-mock-server.go --verbose
```

#### Flags

| Flag        | Default                     | Description                             |
| ----------- | --------------------------- | --------------------------------------- |
| `--port`    | `15678`                     | Port to listen on                       |
| `--log-dir` | `infrastructure/mocks/logs` | Directory for webhook payload JSON logs |
| `--verbose` | `false`                     | Log full request bodies to stdout       |

#### Endpoints

| Method | Path                             | Description               | Response                                       |
| ------ | -------------------------------- | ------------------------- | ---------------------------------------------- |
| `GET`  | `/health`                        | Health check              | `{"status":"healthy","version":"mock-1.0"}`    |
| `GET`  | `/api/workflows`                 | List mock workflows       | Array of 3 workflow objects                    |
| `POST` | `/webhook/resume-deploy`         | Resume deploy webhook     | `{"executionId":"mock-123","status":"queued"}` |
| `POST` | `/webhook/automation-run-report` | Automation report webhook | `{"executionId":"mock-123","status":"queued"}` |

#### Webhook logging

All `POST /webhook/*` payloads are persisted to daily JSON files:

```
infrastructure/mocks/logs/n8n-webhook-YYYY-MM-DD.json
```

Each entry contains:

```json
{
  "timestamp": "2026-03-29T10:30:00+09:00",
  "method": "POST",
  "path": "/webhook/resume-deploy",
  "headers": { "Content-Type": "application/json" },
  "body": { "key": "value" }
}
```

#### Testing with curl

```bash
# Health check
curl http://localhost:15678/health

# List workflows
curl http://localhost:15678/api/workflows

# Simulate resume deploy webhook
curl -X POST http://localhost:15678/webhook/resume-deploy \
  -H "Content-Type: application/json" \
  -d '{"repository":"resume","branch":"master","commit":"abc123"}'

# Simulate automation report
curl -X POST http://localhost:15678/webhook/automation-run-report \
  -H "Content-Type: application/json" \
  -d '{"workflow":"ci","status":"success","duration":120}'

# Inspect logged payloads
cat infrastructure/mocks/logs/n8n-webhook-$(date +%Y-%m-%d).json | jq .
```

---

### `cf-bindings-mock.js` — Cloudflare Worker Binding Mocks

Full-fidelity mock implementations of Cloudflare Worker bindings (D1, KV, R2, Queue) backed by local SQLite, JSON files, and filesystem storage.

#### Classes

| Class             | Cloudflare Equivalent | Local Backend                    | Persistence Path                      |
| ----------------- | --------------------- | -------------------------------- | ------------------------------------- |
| `MockD1Database`  | `D1Database`          | SQLite via `better-sqlite3`      | `infrastructure/mocks/data/d1.sqlite` |
| `MockKVNamespace` | `KVNamespace`         | In-memory + JSON file            | `infrastructure/mocks/data/kv-*.json` |
| `MockR2Bucket`    | `R2Bucket`            | Local filesystem                 | `infrastructure/mocks/data/r2/`       |
| `MockQueue`       | `Queue`               | In-memory with worker simulation | _(not persisted)_                     |

#### Quick usage

```javascript
import { createMockEnv, resetMockData } from './infrastructure/mocks/cf-bindings-mock.js';

// Create mock environment with all default bindings
const env = createMockEnv();

// Use D1
await env.DB.exec('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT)');
const stmt = env.DB.prepare('INSERT INTO users VALUES (?1, ?2)').bind('1', 'Alice');
await stmt.run();
const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind('1').first();

// Use KV
await env.SESSIONS.put('session-abc', JSON.stringify({ userId: '1' }), { expirationTtl: 3600 });
const session = await env.SESSIONS.get('session-abc', 'json');

// Use R2
await env.R2.put('reports/2026-03.pdf', Buffer.from('pdf content'));
const obj = await env.R2.get('reports/2026-03.pdf');
const text = await obj.text();

// Use Queue
const queue = env.CRAWL_TASKS;
await queue.send({ url: 'https://example.com', depth: 1 });

// Clean up persisted data
resetMockData();
```

#### `createMockEnv()` options

```javascript
createMockEnv({
  // Custom data directory (default: infrastructure/mocks/data/)
  dataDir: '/tmp/mock-data',

  // Queue worker function for processing messages
  queueWorker: async (batch) => {
    for (const msg of batch.messages) {
      console.log('Processing:', msg.body);
      msg.ack();
    }
  },

  // Additional KV binding names
  kvBindings: ['MY_CUSTOM_KV', 'CACHE_KV'],

  // Include default aliases like JOB_DASHBOARD_DB, BUCKET (default: true)
  includeDefaultAliases: true,
});
```

#### Default bindings

| Binding Name                            | Type  | Description      |
| --------------------------------------- | ----- | ---------------- |
| `DB`                                    | D1    | Primary database |
| `SESSIONS`                              | KV    | Session storage  |
| `RATE_LIMIT_KV`                         | KV    | Rate limiting    |
| `NONCE_KV`                              | KV    | Nonce tracking   |
| `R2`                                    | R2    | Object storage   |
| `CRAWL_TASKS`                           | Queue | Task queue       |
| `job_dashboard_db` / `JOB_DASHBOARD_DB` | D1    | Alias for `DB`   |
| `BUCKET`                                | R2    | Alias for `R2`   |

#### Data persistence paths

All mock data persists under `infrastructure/mocks/data/` by default:

```
infrastructure/mocks/data/
├── d1.sqlite              # D1 database (SQLite, WAL mode)
├── kv-sessions.json       # SESSIONS KV store
├── kv-rate-limit.json     # RATE_LIMIT_KV store
├── kv-nonce.json          # NONCE_KV store
└── r2/                    # R2 bucket (filesystem mirror)
    └── *.meta.json        # R2 object metadata sidecars
```

---

## 🗺️ CI Stage Mapping

How local stages map to the real CI pipeline in `.github/workflows/ci.yml`:

| Local Stage  | CI Job(s)                | Local Commands                                                                                               | CI Conditions                                      |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `analyze`    | `analyze`                | `go run ./tools/ci/affected.go`                                                                              | Always runs                                        |
| `validate`   | `validate-cloudflare`    | `go run ./tools/ci/validate-cloudflare-native.go`                                                            | portfolio or job-dashboard affected                |
|              |                          | `npx wrangler types /tmp/portfolio-worker-types.d.ts --config apps/portfolio/wrangler.toml --env production` |                                                    |
|              |                          | `npx wrangler types /tmp/job-dashboard-worker-types.d.ts --config apps/job-dashboard/wrangler.jsonc`         |                                                    |
| `lint`       | `lint`                   | `npm run lint`                                                                                               | Always runs                                        |
| `typecheck`  | `typecheck`              | `npm run typecheck`                                                                                          | Always runs                                        |
| `data-drift` | `data-drift`             | `npm run sync:data`                                                                                          | data or portfolio affected                         |
|              |                          | `git diff --exit-code apps/portfolio/data.json apps/portfolio/data_en.json apps/portfolio/data_ja.json`      |                                                    |
| `test`       | `test-unit` + `test-e2e` | `npm test`                                                                                                   | Always (unit); portfolio affected (e2e)            |
|              |                          | `npm run test:coverage`                                                                                      |                                                    |
|              |                          | `npm run sync:data`                                                                                          |                                                    |
|              |                          | `npm --prefix apps/portfolio run build`                                                                      |                                                    |
|              |                          | `npm run test:e2e:smoke`                                                                                     |                                                    |
| `security`   | `security-scan`          | `gitleaks detect --source . --config .gitleaks.toml --verbose --no-git`                                      | Always runs                                        |
|              |                          | `npm audit --audit-level=high`                                                                               |                                                    |
| `build`      | `build`                  | `npm run sync:data`                                                                                          | portfolio affected; after lint+typecheck+test pass |
|              |                          | `npm --prefix apps/portfolio run build`                                                                      |                                                    |

### CI dependency graph

```
analyze ──→ validate-cloudflare ──┐
       ──→ lint ──────────────────┤
       ──→ typecheck ─────────────┤──→ build ──→ elk-ingest
       ──→ data-drift ────────────┤
       ──→ test-unit ─────────────┤
       ──→ test-e2e ──────────────┤
       ──→ security-scan ─────────┘
```

---

## 🐛 Common Debugging Scenarios

### Test CI pipeline locally before pushing

```bash
# Full pipeline check
go run tools/scripts/run-ci-local.go

# Quick validation (lint + typecheck only)
go run tools/scripts/run-ci-local.go --stage lint,typecheck

# Check what CI would run without executing
go run tools/scripts/run-ci-local.go --dry-run

# Review the report
cat .ci-local/ci-report-*.txt | tail -20
```

### Debug failing E2E tests

```bash
# Start the local dev server
go run tools/scripts/local-dev-up.go --portfolio

# In another terminal, run E2E tests with debug output
DEBUG=pw:api npm run test:e2e:smoke

# Or run specific test file
npx playwright test tests/e2e/specific-test.spec.ts --headed --debug

# Check Playwright report
npx playwright show-report
```

### Test n8n webhooks without real n8n

```bash
# Start mock server
go run infrastructure/mocks/n8n-mock-server.go --verbose

# Trigger webhook from your code or curl
curl -X POST http://localhost:15678/webhook/resume-deploy \
  -H "Content-Type: application/json" \
  -d '{"event":"deploy","status":"success"}'

# Inspect what was received
cat infrastructure/mocks/logs/n8n-webhook-$(date +%Y-%m-%d).json | jq .
```

### Mock Cloudflare bindings for unit tests

```javascript
// In your test file
import { createMockEnv, resetMockData } from '../../infrastructure/mocks/cf-bindings-mock.js';

describe('Worker handler', () => {
  let env;

  beforeEach(() => {
    resetMockData();
    env = createMockEnv();
  });

  afterAll(() => {
    env.DB.close();
    resetMockData();
  });

  it('should store and retrieve data', async () => {
    await env.DB.exec('CREATE TABLE items (id TEXT, value TEXT)');
    await env.DB.prepare('INSERT INTO items VALUES (?1, ?2)').bind('key1', 'value1').run();

    const result = await env.DB.prepare('SELECT * FROM items WHERE id = ?1').bind('key1').first();

    expect(result.value).toBe('value1');
  });
});
```

### Run full local stack

```bash
# Terminal 1: Start all services
go run tools/scripts/local-dev-up.go --all

# Terminal 2: Run CI validation against local stack
go run tools/scripts/run-ci-local.go --mock

# Terminal 3: Test specific webhook integration
curl -X POST http://localhost:15678/webhook/resume-deploy \
  -d '{"trigger":"manual"}' -H "Content-Type: application/json"
```

---

## 🔄 Integration with `act`

[`act`](https://github.com/nektos/act) runs GitHub Actions workflows locally using Docker. It complements `run-ci-local.go` for testing the actual workflow YAML.

### Installation

```bash
# macOS
brew install act

# Linux
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Usage with this repo

```bash
# List available jobs
act -l

# Run full CI pipeline
act push

# Run specific job
act -j lint
act -j typecheck
act -j test-unit

# Run with secrets
act push --secret-file .env.act

# Dry run
act push -n
```

### `.env.act` file (create if needed)

```env
# Minimal secrets for local act runs
CI=true
NODE_VERSION=22
```

### Differences from `run-ci-local.go`

| Aspect       | `run-ci-local.go`       | `act`                        |
| ------------ | ----------------------- | ---------------------------- |
| Speed        | Fast (native execution) | Slower (Docker containers)   |
| Fidelity     | Command-level mapping   | Full workflow YAML execution |
| Dependencies | Local toolchain         | Docker                       |
| Environment  | Approximates CI env     | Reproduces CI env            |
| Use case     | Quick pre-push check    | Debug workflow YAML issues   |

**Recommendation**: Use `run-ci-local.go` for fast pre-push validation. Use `act` when debugging workflow-level issues (job dependencies, conditional expressions, artifact passing).

---

## 🔍 Troubleshooting

### `run-ci-local.go` fails to find repository root

**Symptom**: `ERROR repository root not found (missing .github/workflows/ci.yml)`

**Fix**: Run from within the repository, or ensure `.github/workflows/ci.yml` exists.

```bash
cd /path/to/resume
go run tools/scripts/run-ci-local.go
```

### `gitleaks` not found during security stage

**Symptom**: `exec: "gitleaks": executable file not found in $PATH`

**Fix**: Install gitleaks or skip the security stage.

```bash
# Install
brew install gitleaks  # macOS
# or
go install github.com/gitleaks/gitleaks/v8@latest

# Or skip the stage
go run tools/scripts/run-ci-local.go --stage lint,typecheck,test,build
```

### Portfolio dev server won't start

**Symptom**: Health check timeout for portfolio service.

**Fix**: Ensure dependencies are installed and data is synced.

```bash
npm ci
npm run sync:data
npm --prefix apps/portfolio run build
# Then retry
go run tools/scripts/local-dev-up.go --portfolio
```

### Job-server skipped: docker-compose not found

**Symptom**: `WARN job-server skipped: docker-compose/docker not found in PATH`

**Fix**: Install Docker and docker-compose.

```bash
# Verify installation
docker --version
docker compose version
```

### n8n mock log directory permission error

**Symptom**: `failed to create log directory`

**Fix**: Ensure the log directory is writable.

```bash
mkdir -p infrastructure/mocks/logs
chmod 755 infrastructure/mocks/logs
```

### `cf-bindings-mock.js` import fails

**Symptom**: `Cannot find module 'better-sqlite3'`

**Fix**: Install the dependency.

```bash
npm ci
# or specifically
npm install better-sqlite3
```

### Port already in use

**Symptom**: `listen tcp :15678: bind: address already in use`

**Fix**: Find and kill the conflicting process.

```bash
lsof -i :15678
kill <PID>

# Or use a different port
go run infrastructure/mocks/n8n-mock-server.go --port 19999
```

### Stale mock data causing test failures

**Symptom**: Tests fail with unexpected data from previous runs.

**Fix**: Reset mock data.

```javascript
import { resetMockData } from './infrastructure/mocks/cf-bindings-mock.js';
resetMockData();
```

Or delete manually:

```bash
rm -rf infrastructure/mocks/data/
rm -rf infrastructure/mocks/logs/
```
