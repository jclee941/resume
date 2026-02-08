# PROJECT KNOWLEDGE BASE: CLI

**Generated:** 2026-02-09
**Commit:** 29d46c2
**Branch:** master

## OVERVIEW

CLI tool for deployment and management. Entry point: `bin/run.js`.
Node.js-based deployment orchestrator (Commander.js).
Centralizes infrastructure management, Wrangler automation, and production verification.
Acts as the gatekeeper for all monorepo deployments.

## STRUCTURE

```
typescript/cli/
├── bin/
│   └── run.js          # Entry point, loads .env from root
├── src/
│   └── commands/
│       ├── deploy.js   # Wrangler deployment wrapper
│       └── verify.js   # Service health checks (HEAD requests)
└── package.json        # Dependencies: commander, chalk, node-fetch
```

## WHERE TO LOOK

| Task             | Location                 | Notes                                      |
| ---------------- | ------------------------ | ------------------------------------------ |
| **CLI Setup**    | `bin/run.js`             | Environment loading & command registration |
| **Deployment**   | `src/commands/deploy.js` | Cross-package wrangler orchestration       |
| **Verification** | `src/commands/verify.js` | Production health check logic              |
| **Metadata**     | `package.json`           | Tooling version and binary definitions     |

## CONVENTIONS

- **Root Environment**: Always loads `.env` from the project root.
- **Wrangler Wrapper**: Never use `wrangler` directly; use `resume-cli deploy`.
- **Exit Codes**: Returns `1` on any failure to block CI/CD pipelines.
- **ESM Only**: All files use native Node.js ES Modules.

## ANTI-PATTERNS

- **Local Secrets**: Do not store secrets in `typescript/cli/.env`. Use monorepo root.
- **Manual Verification**: Avoid manual health checks; use `resume-cli verify`.
- **Hardcoded URLs**: All endpoints should ideally be derived or clearly listed in verify.

## COMMANDS

```bash
# Verify all production services
node typescript/cli/bin/run.js verify

# Deploy portfolio with specific worker
node typescript/cli/bin/run.js deploy --worker-file typescript/portfolio-worker/worker.js
```
