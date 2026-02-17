# TOOLS KNOWLEDGE BASE

**Generated:** 2026-02-09
**Commit:** 29d46c2
**Branch:** master

## OVERVIEW

Bazel facade + npm scripts. Bazel coordinates, npm executes (hybrid Google3 style).

## STRUCTURE

```
tools/
├── ci/
│   └── affected.sh          # Change analysis for CI
├── scripts/
│   ├── bazel/               # Bazel wrapper scripts
│   ├── build/               # Asset generation (PDF, PPTX, icons)
│   │   ├── pdf-generator.sh     # HTML → PDF via Puppeteer
│   │   ├── pptx_engine.py       # PowerPoint generation
│   │   ├── pptx_templates.py    # PPTX template definitions
│   │   ├── generate-icons.js    # Favicon/icon generation
│   │   └── generate-screenshots.js
│   ├── deployment/          # Deploy scripts
│   │   ├── quick-deploy.sh      # Atomic deployment
│   │   └── deploy-grafana.sh
│   ├── monitoring/          # Health/metrics scripts
│   ├── setup/               # Environment setup
│   ├── utils/               # Utilities
│   │   └── sync-resume-data.js  # SSoT propagation
│   └── verification/        # Post-deploy checks
│       └── verify-deployment.sh # 7 health checks
└── BUILD.bazel              # Bazel targets
```

## KEY SCRIPTS

| Script                                      | Purpose                              |
| ------------------------------------------- | ------------------------------------ |
| `ci/affected.sh`                            | Find targets affected by git changes |
| `scripts/build/pdf-generator.sh`            | Generate PDF from HTML               |
| `scripts/build/pptx_engine.py`              | Generate PowerPoint decks            |
| `scripts/deployment/quick-deploy.sh`        | Atomic deploy with rollback          |
| `scripts/utils/sync-resume-data.js`         | Propagate SSoT changes               |
| `scripts/verification/verify-deployment.sh` | 7-point health check                 |

## BUILD SCRIPTS (scripts/build/)

| Script                        | Input        | Output      | Tech        |
| ----------------------------- | ------------ | ----------- | ----------- |
| `pdf-generator.sh`            | HTML resume  | PDF         | Puppeteer   |
| `pptx_engine.py`              | JSON data    | PPTX        | python-pptx |
| `generate-icons.js`           | Source image | Favicons    | Sharp       |
| `generate-screenshots.js`     | URLs         | Screenshots | Puppeteer   |
| `generate-resume-variants.js` | Master JSON  | Variants    | Node.js     |

## CONVENTIONS

- **Root Execution**: All scripts assume `pwd` is project root.
- **Bazel Facade**: Use `bazel build //...` for coordination, but scripts run npm.
- **Robust Bash**: `set -euo pipefail` in all shell scripts.
- **Idempotent**: Scripts safe to re-run.
- **No Direct Edits**: Use scripts for all automated tasks.

## CI WORKFLOW

```bash
# Find affected targets
./tools/ci/affected.sh origin/master

# Build all
bazel build //...

# Test all
bazel test //...

# Deploy (atomic)
./tools/scripts/deployment/quick-deploy.sh

# Verify
./tools/scripts/verification/verify-deployment.sh
```

## ANTI-PATTERNS

| Anti-Pattern             | Why                    | Do Instead                   |
| ------------------------ | ---------------------- | ---------------------------- |
| Run scripts from subdirs | Path assumptions break | Always run from project root |
| Skip affected.sh in CI   | Builds everything      | Use affected.sh for speed    |
| Manual deployments       | No rollback            | Use quick-deploy.sh          |
| Edit generated files     | Overwritten on build   | Edit source, run generator   |
| Hardcode paths           | Breaks portability     | Use relative paths from root |

## COMMANDS

```bash
# From project root
npm run build:all      # Build everything
npm run test:all       # Run all tests
npm run sync:data      # Propagate SSoT changes

# Bazel
bazel build //tools:deploy
bazel query "//..."
```
