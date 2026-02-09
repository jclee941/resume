# AGENTS.md: SHARED DATA KNOWLEDGE BASE

**Generated:** 2026-02-09
**Commit:** 29d46c2
**Branch:** master

## OVERVIEW

The central Single Source of Truth (SSoT) for all resume variants, technical documentation, and application data across the monorepo. This package provides the data foundation for the Portfolio (Web), Job Automation (MCP), and Deployment CLI. It includes JSON schemas for data validation and canonical resume data.

## STRUCTURE

```
typescript/data/
└── resumes/
    ├── master/          # SOURCE: Canonical career data (JSON/MD)
    ├── technical/       # DEEP DIVE: Project architecture & spec docs
    ├── applications/    # TARGETS: Role-specific application bundles
    ├── archive/         # HISTORY: Legacy files and snapshots (2018-2025)
    └── generated/       # ARTIFACTS: Pandoc/CLI output (git-ignored)
```

## WHERE TO LOOK

| Task                  | Location                          | Notes                                 |
| --------------------- | --------------------------------- | ------------------------------------- |
| **Global Data**       | `resumes/master/resume_data.json` | SSoT for automation & portfolio sync. |
| **Human Source**      | `resumes/master/resume_master.md` | Primary Markdown for CV generation.   |
| **Project Specs**     | `resumes/technical/{project}/`    | Architecture, DR, SOC deep-dives.     |
| **Company Tailoring** | `resumes/applications/`           | Role-specific resume variants.        |
| **Legacy Records**    | `resumes/archive/`                | Historical version snapshots.         |

## CONVENTIONS

- **Data-Driven Automation**: `resume_data.json` is the authoritative source for `typescript/portfolio-worker` and `typescript/job-automation`.
- **Markdown Authority**: All PDF/DOCX artifacts must be derived from `.md` sources. Never edit PDFs directly.
- **Synchronization**: Run `npm run sync:data` from root to propagate JSON changes to `typescript/portfolio-worker/data.json`.
- **Versioning**: Released artifacts follow `resume_{type}_vX.Y.Z.pdf` naming in `master/`.
- **Isolation**: Keep technical project documentation (e.g., Nextrade) strictly in `technical/{project}/`.
- **Skills Format**: Skills in `resume_data.json` use `{name, level}` objects (not plain strings). All consumers (validators, cards, sync) must handle this structured format.

## ANTI-PATTERNS

- **Manual PDF Edits**: Changes will be lost; always regenerate using `pdf-generator.sh`.
- **Loose Files**: Move unversioned or temporary PDFs to `resumes/generated/`.
- **Data Drift**: Modifying `resume_data.json` without verifying consistency with `resume_master.md`.
- **Context Pollution**: Do not store operational scripts or code in this package.
- **Absolute Paths**: Always use relative paths for cross-references between documentation files.

## COMMANDS

```bash
# Sync data to portfolio
npm run sync:data      # Propagates master JSON to portfolio

# Generate all PDF artifacts
./scripts/build/pdf-generator.sh all

# Verify data consistency
npm run cli:verify     # Checks data integrity across apps
```
