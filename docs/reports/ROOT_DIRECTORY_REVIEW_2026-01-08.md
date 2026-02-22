# ROOT DIRECTORY REVIEW

**Generated:** 2026-01-08

## OVERVIEW

Clean, standard polyglot monorepo structure. Separation of concerns is clear:

- `typescript/portfolio-worker/`: Portfolio frontend (Cloudflare Worker)
- `typescript/job-automation/`: Backend automation (Node.js)
- `cmd/`: Ops tooling (Go)
- `scripts/`: Shared utilities

## DIRECTORY ANALYSIS

| Directory             | Purpose            | Status     | Action       |
| --------------------- | ------------------ | ---------- | ------------ |
| `typescript/portfolio-worker/`                | Portfolio Frontend | ✅ Clean   | None         |
| `typescript/job-automation/` | Automation Server  | ✅ Clean   | None         |
| `cmd/`                | Go CLI             | ✅ Clean   | None         |
| `infrastructure/`     | Infra Configs      | ✅ Clean   | None         |
| `resumes/`            | Content            | ✅ Clean   | None         |
| `docs/`               | Documentation      | ✅ Clean   | None         |
| `_bmad/`              | AI Workflows       | ✅ Clean   | None         |
| `scripts/`            | Automation Scripts | ⚠️ Crowded | **Refactor** |

## SCRIPTS DIRECTORY REFACTORING

Current `scripts/` has 26 files. Recommendation: split into functional subdirectories.

### Proposed Structure

```
scripts/
├── deploy/              # Deployment scripts
│   ├── deploy.sh
│   ├── deploy-helper.sh
│   ├── quick-deploy.sh
│   ├── deploy-with-monitoring.sh
│   └── deploy-grafana-configs.sh
├── ci/                  # CI/CD & Quality
│   ├── setup-github-actions.sh
│   ├── auto-setup-github-actions.sh
│   ├── verify-cicd.sh
│   ├── verify-deployment.sh
│   └── monitor-deployment.sh
├── assets/              # Asset generation
│   ├── generate-icons.js
│   ├── generate-resume-variants.js
│   ├── generate-screenshots.js
│   ├── generate_shinhan_pptx.py
│   ├── convert-icons-to-png.js
│   ├── optimize-images.js
│   └── pdf-generator.sh
└── utils/               # General utilities
    ├── sync-resume-data.js
    ├── bump-version.js
    ├── record-demo-video.js
    ├── configure-n8n-workflows.js
    └── setup-monitoring.sh
```

## ACTION ITEMS

1. **Create Subdirectories**: `scripts/{deploy,ci,assets,utils}`
2. **Move Files**: Categorize scripts into new folders
3. **Update References**: `package.json` scripts need updates (31 references)
4. **Update CI**: `.github/workflows/deploy.yml` and GitHub workflows need updates
5. **Update Docs**: Documentation references need updates

**Constraint**: `package.json` relies heavily on flat `scripts/` path.
**Decision**: Keep flat for now to avoid breaking CI/automation. Refactor requires coordinated "stop-the-world" change.

## SUMMARY

Root directory is well-organized. `scripts/` is the only candidate for cleanup, but high cost to refactor due to hardcoded references in `package.json`, CI configs, and documentation.

**Recommendation**: Maintain flat `scripts/` for stability. Use naming conventions (`deploy-*`, `generate-*`, `setup-*`) for logical grouping instead of physical folders.
