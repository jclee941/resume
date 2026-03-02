# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-02
**Commit:** d2a27b6
**Branch:** master

## OVERVIEW

Personal resume management system with multi-format output. Layer-based npm workspaces monorepo hosting 3 deployable Cloudflare Workers/servers and 2 shared packages. Serves a cyberpunk terminal portfolio at `resume.jclee.me` and automates Korean job platform workflows via MCP server + dashboard API.

## STRUCTURE

```text
./
├── apps/
│   ├── portfolio/              # CF Worker: cyberpunk terminal portfolio (resume.jclee.me)
│   ├── job-server/             # MCP Server + Fastify for job platform automation
│   └── job-dashboard/          # CF Worker: dashboard API (resume.jclee.me/job/*)
├── packages/
│   ├── cli/                    # Commander.js CLI for resume operations
│   └── data/                   # SSoT for resume variants (master JSON)
├── infrastructure/
│   ├── cloudflare/             # Terraform (Cloudflare resources)
│   ├── monitoring/             # Grafana, Loki, Prometheus configs
│   ├── database/               # D1 migration scripts
│   ├── nginx/                  # Reverse proxy configs
│   └── n8n/                    # Workflow automation
├── tools/
│   ├── scripts/                # Build, deploy, monitoring, setup, utils, verification
│   ├── ci/                     # CI helper scripts
│   └── BUILD.bazel             # Bazel facade
├── tests/
│   ├── unit/                   # Jest test suites (33 suites, 712 tests)
│   ├── e2e/                    # Playwright end-to-end tests (24 files)
│   └── integration/            # Integration tests (3 files)
├── docs/                       # Architecture, guides, analysis, reports, planning
├── ta/                         # Python PPTX analysis scripts
├── third_party/                # Bazel dependency coordination
├── .github/
│   ├── workflows/              # 19 CI/CD workflows
│   └── actions/setup/          # Composite setup action (Node 22 + npm ci)
├── package.json                # Root workspace config (v1.0.128)
├── wrangler.jsonc              # Portfolio worker config (resume.jclee.me)
├── jsconfig.json               # TypeScript checking config
├── eslint.config.cjs           # ESLint flat config
├── jest.config.cjs             # Jest test config
├── playwright.config.js        # Playwright E2E config
└── Dockerfile                  # Job server container
```

## WHERE TO LOOK

| Task                      | Location                            | Notes                                    |
| ------------------------- | ----------------------------------- | ---------------------------------------- |
| Portfolio markup/styles   | `apps/portfolio/`                   | See `apps/portfolio/AGENTS.md`           |
| Portfolio build pipeline  | `apps/portfolio/generate-worker.js` | HTML→CSP→inline→worker.js                |
| MCP server + tools        | `apps/job-server/src/`              | See `apps/job-server/AGENTS.md`          |
| Dashboard API + workflows | `apps/job-dashboard/src/`           | See `apps/job-dashboard/AGENTS.md`       |
| Resume CLI                | `packages/cli/`                     | Commander.js, `packages/cli/AGENTS.md`   |
| Resume data (SSoT)        | `packages/data/resumes/`            | Master JSON → sync → portfolio data.json |
| Terraform (Cloudflare)    | `infrastructure/cloudflare/`        | CF Workers, DNS, KV, D1 resources        |
| Monitoring                | `infrastructure/monitoring/`        | Grafana dashboards, Loki, Prometheus     |
| Build/deploy scripts      | `tools/scripts/`                    | See `tools/AGENTS.md`                    |
| Unit tests                | `tests/unit/`                       | Jest suites, 712 tests                   |
| E2E tests                 | `tests/e2e/`                        | Playwright, 24 test files                |
| CI pipeline               | `.github/workflows/ci.yml`          | 8-job validation pipeline                |
| Auto-release              | `.github/workflows/release.yml`     | Triggers on CI completion                |
| Post-deploy verification  | `.github/workflows/verify.yml`      | Portfolio + dashboard health checks      |
| Worker config (portfolio) | `wrangler.jsonc`                    | Routes, D1/KV bindings, assets           |
| Worker config (dashboard) | `apps/job-dashboard/wrangler.toml`  | D1/KV/Queue bindings, environments       |

## WORKSPACES

| Package                        | Path                  | Type    | Description                    |
| ------------------------------ | --------------------- | ------- | ------------------------------ |
| `@resume/portfolio-worker`     | `apps/portfolio/`     | App     | CF Worker: cyberpunk portfolio |
| `@resume/job-automation`       | `apps/job-server/`    | App     | MCP Server + Fastify (ESM)     |
| `@resume/job-dashboard-worker` | `apps/job-dashboard/` | App     | CF Worker: dashboard API (ESM) |
| `@resume/cli`                  | `packages/cli/`       | Package | Commander.js CLI (ESM)         |
| `@resume/data`                 | `packages/data/`      | Package | Resume data SSoT               |

## DEPLOYMENTS

| App           | Domain                  | Platform           | Deploy Method                |
| ------------- | ----------------------- | ------------------ | ---------------------------- |
| Portfolio     | `resume.jclee.me`       | Cloudflare Workers | CF Workers Builds (git push) |
| Job Dashboard | `resume.jclee.me/job/*` | Cloudflare Workers | CF Workers Builds (git push) |
| Job Server    | Local / Docker          | Node.js + Fastify  | Docker / manual              |

**Deploy authority**: Cloudflare Workers Builds deploys on push to `master`. GitHub Actions is CI only — never deploy authority.

## STORAGE BINDINGS

| Binding          | Type  | Used By               | Purpose                            |
| ---------------- | ----- | --------------------- | ---------------------------------- |
| `resume-prod-db` | D1    | Portfolio + Dashboard | Applications, job cache, sync logs |
| `SESSIONS`       | KV    | Portfolio + Dashboard | Session storage                    |
| `RATE_LIMIT_KV`  | KV    | Portfolio + Dashboard | Rate limiting                      |
| `NONCE_KV`       | KV    | Portfolio             | CSP nonce tracking                 |
| `crawl-tasks`    | Queue | Dashboard             | Crawl job queue                    |

## CI/CD PIPELINE

```
push/PR → ci.yml (8 jobs) → release.yml (auto-release) → CF Workers Builds (deploy)
                                                        → verify.yml (health checks)
```

### CI Jobs (ci.yml — "CI Validation Pipeline")

1. `analyze` — dependency review
2. `validate-cf` — Wrangler config validation
3. `lint` — ESLint
4. `typecheck` — tsc --noEmit
5. `test-unit` — Jest (33 suites, 712 tests)
6. `test-e2e` — Playwright
7. `security-scan` — security audit
8. `build` → `elk-ingest` — build portfolio worker + log to ELK

ELK ingest uses reusable workflow `qws941/.github/.github/workflows/_elk-ingest.yml@master`.

### Synced Workflows (from qws941/.github SSoT)

`auto-merge`, `codex-auto-issue`, `codex-triage`, `commitlint`, `labeler`, `lock-threads`, `pr-size`, `release-drafter`, `stale`, `welcome`

### Repo-Specific Workflows

`ci`, `codeql`, `maintenance`, `release`, `terraform`, `update-snapshots`, `vault-test`, `verify`

## CONVENTIONS

### Code Style

- JavaScript primary (.js), TypeScript for types only (.ts)
- ESM in apps/packages (`"type": "module"`), CJS for root configs
- Node ≥22 required (`.nvmrc`)
- ESLint flat config, Prettier formatting
- `@lib/*` path alias → `apps/portfolio/lib/*` (jsconfig.json)

### Build Pipeline (Portfolio)

```
packages/data/ → sync → apps/portfolio/data.json
apps/portfolio/index.html → generate-worker.js → worker.js → CF Workers Builds
                                ↓
                        escape backticks
                        compute CSP hashes
                        inline CSS + data
```

### Architecture (Job Server)

- Hexagonal: services (domain) ↔ clients (adapters)
- DI via constructor injection, no global state
- MCP tool export: `export const {name}Tool = { ... }`
- Fastify route: `export default async function nameRoutes(fastify)`
- 16 MCP tools, 13 Fastify route modules
- Skills v1 API only (v2 broken). Links API broken (500).

### Testing

- Jest for unit tests (`tests/unit/`, 33 suites, 712 tests)
- node:test for job-server tests (`apps/job-server/src/**/*.test.js`, 93 tests)
- Playwright for E2E (`tests/e2e/`, 24 files)
- c8 for coverage

### Deployment

- CF Workers Builds is deploy authority (triggers on git push to master)
- GitHub Actions is CI only — never deploys
- Manual `npm run deploy` is BLOCKED (prints error)

### Commits and PRs

- Conventional Commits: `type(scope): imperative summary` (≤72 chars, lowercase)
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`, `perf`, `build`, `revert`
- Squash merge only. ~200 LOC max per PR.
- SHA-pin all GitHub Actions with `# vN` version comment

### Governance

- OWNERS (Google3/K8s-style) + CODEOWNERS (GitHub-native), both `qws941`
- CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md — GitHub auto-inherits from qws941/.github

## COMMANDS

```bash
# Build
npm run build                    # Generate portfolio worker.js

# Test
npm test                         # Jest unit + node:test (job-server)
npm run test:e2e                 # Playwright E2E tests

# Quality
npm run lint                     # ESLint
npm run typecheck                # tsc --noEmit

# Data
npm run sync:data                # Propagate resume SSoT to portfolio

# Validation
npm run automate:full            # Full validation pipeline

# Development
npm start -w @resume/portfolio-worker    # Local dev server (wrangler dev)
npm run dev -w @resume/job-automation    # Job server dev (watch mode)
```

## ANTI-PATTERNS (THIS PROJECT)

- Never edit `apps/portfolio/worker.js` directly — it is generated by `generate-worker.js`.
- Never use naked Puppeteer — always stealth plugins + UA rotation.
- Never treat GitHub Actions as deploy authority — CF Workers Builds deploys on push.
- Never use mutable action tags (`@v4`) — always SHA-pin with version comment.
- Never use `networkidle` in Playwright — use `domcontentloaded`.
- Never import from `apps/job-server/lib/` — it is DEPRECATED. Use `src/shared/` directly.
- Never use Skills v2 API or Links API — both are broken.
- Never suppress type errors (`as any`, `@ts-ignore`, `@ts-expect-error`).
- Never hardcode credentials, resume IDs, or session tokens.
- Never set KV entries without TTL.
- Never run `npm run deploy` — it is blocked. Use git push for CF Workers Builds.
- Never use merge commits — squash merge only.

## UNIQUE STYLES

- Layer-based monorepo: `apps/` (deployables) + `packages/` (shared libraries).
- Build-time asset inlining: portfolio has zero runtime I/O.
- Cyberpunk terminal UI: CSS-only dark theme with green/cyan accent palette.
- Multi-language resume: `data.json` (ko), `data_en.json`, `data_ja.json`.
- Stealth crawling: UA rotation, 1s+ jitter, rebrowser-puppeteer for anti-detection.
- Bazel facade: BUILD.bazel files exist but primary build is npm scripts.
- Dual worker entry: `apps/portfolio/entry.js` routes to both portfolio and job-dashboard.
- Child AGENTS.md files in ~40 subdirectories for domain-specific knowledge.

## NOTES

- **Sync conflict**: AGENTS.md is synced FROM `qws941/.github` to all repos including this one. This project-specific version will be overwritten on next sync unless removed from `.github/sync.yml`.
- Large files in job-server: `resume.js` (869 LOC), `profile-sync.js` (966), `auth-sync.js` (846).
- `ta/` contains Python PPTX analysis scripts — orphaned from main project structure.
- `third_party/` is Bazel dependency coordination — One Version Rule compliance.
- Secrets required: `GH_PAT` (auto-merge), `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (CF deploy), `ELASTICSEARCH_URL` (ELK ingest).

## Review guidelines

- Enforce conventional commit format in PR titles: `type(scope): summary`.
- All GitHub Actions must be SHA-pinned with `# vN` version comment — flag any mutable tag (`@v4`).
- Never approve PRs that add `as any`, `@ts-ignore`, `@ts-expect-error`, or empty `catch {}` blocks.
- Never approve PRs that hardcode IPs, secrets, or credentials.
- PR size should be ~200 LOC max. Flag PRs exceeding 400 LOC.
- Squash merge only — flag merge commits or rebase merges.
- Trunk-based development — flag long-lived feature branches.
- Review SLA context: non-blocking feedback uses `nit:` prefix.
- For Terraform changes: verify no hardcoded IPs, use variables/env vars.
- For workflow changes: verify SHA-pinned actions, correct `workflow_call` inputs, proper permissions scoping.
- Portfolio changes: verify `worker.js` is not edited directly; verify build succeeds.
- Job server changes: verify hexagonal architecture (services ↔ clients), no `lib/` imports.
