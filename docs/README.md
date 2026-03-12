# Documentation Directory

> Parent: [../AGENTS.md](../AGENTS.md)

**Last Updated:** 2026-02

## Overview

Project documentation hub for the Resume Portfolio system. Contains deployment guides, architecture decisions, analysis reports, and workflow documentation.

## Structure

```
docs/
├── adr/                 # Numbered architecture decision records
├── architecture/        # Current system shape and implementation docs
├── guides/              # Step-by-step deployment & setup guides
├── analysis/            # Code analysis, generated deep reviews
├── reports/             # Historical reports and audits
├── planning/            # Project planning and roadmaps
├── api/                 # API-specific references
└── thoughts/            # AI session ledgers and design notes
```

## Active Project Locations

| Component            | Location                        | Notes                      |
| -------------------- | ------------------------------- | -------------------------- |
| **Portfolio Worker** | `apps/portfolio/`               | Edge-deployed Cloudflare   |
| **Job Automation**   | `apps/job-server/`              | MCP server + dashboard     |
| **CLI Tool**         | `packages/cli/`                 | Deployment orchestration   |
| **Resume Data**      | `packages/data/resumes/master/` | SSoT: resume_data.json     |
| **Infrastructure**   | `infrastructure/`               | Grafana, Loki, n8n configs |

## Key Documentation

| Guide                      | Location                              | Purpose                        |
| -------------------------- | ------------------------------------- | ------------------------------ |
| **Infrastructure**         | `guides/INFRASTRUCTURE.md`            | Complete system topology       |
| **Monitoring Setup**       | `guides/MONITORING_SETUP.md`          | Prometheus, Grafana, Loki, n8n |
| **Manual Deployment**      | `guides/MANUAL_DEPLOYMENT_GUIDE.md`   | Step-by-step deploy process    |
| **PDF Generation**         | `guides/PDF_GENERATION.md`            | Resume PDF generation          |
| **Deployment Pipeline**    | `architecture/DEPLOYMENT_PIPELINE.md` | CI/CD architecture             |
| **Architecture Decisions** | `adr/0001-monorepo-structure.md`      | Durable design decisions       |

## Conventions

- **Markdown Format**: All docs in `.md` with frontmatter when needed
- **Naming**: `SCREAMING_SNAKE_CASE.md` for guides, `kebab-case.md` for notes
- **Date Prefix**: Reports use `YYYY-MM-DD-` prefix for chronological ordering
- **Relative Links**: Always use relative paths for cross-references

## Notes

- Historical docs may reference removed GitHub Actions configuration or outdated tree layouts
- ADRs live in `adr/`, not `architecture/`
- Notes in `thoughts/` are ephemeral and should not be treated as canonical rules
