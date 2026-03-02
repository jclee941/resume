# Documentation Directory

> Parent: [../AGENTS.md](../AGENTS.md)

**Last Updated:** 2026-02

## Overview

Project documentation hub for the Resume Portfolio system. Contains deployment guides, architecture decisions, analysis reports, and workflow documentation.

## Structure

```
docs/
├── guides/              # Step-by-step deployment & setup guides
├── architecture/        # System design, ADRs, technical decisions
├── analysis/            # Code analysis, performance reports
├── reports/             # Generated reports, audits
├── planning/            # Project planning, roadmaps
├── sessions/            # Development session notes
├── thoughts/            # AI session ledgers
└── _vendor/             # Third-party documentation (bmad, etc.)
```

## Active Project Locations

| Component            | Location                          | Notes                      |
| -------------------- | --------------------------------- | -------------------------- |
| **Portfolio Worker** | `apps/portfolio/`    | Edge-deployed Cloudflare   |
| **Job Automation**   | `apps/job-server/`      | MCP server + dashboard     |
| **CLI Tool**         | `packages/cli/`                 | Deployment orchestration   |
| **Resume Data**      | `packages/data/resumes/master/` | SSoT: resume_data.json     |
| **Infrastructure**   | `infrastructure/`                 | Grafana, Loki, n8n configs |

## Key Documentation

| Guide                   | Location                              | Purpose                        |
| ----------------------- | ------------------------------------- | ------------------------------ |
| **Infrastructure**      | `guides/INFRASTRUCTURE.md`            | Complete system topology       |
| **Monitoring Setup**    | `guides/MONITORING_SETUP.md`          | Prometheus, Grafana, Loki, n8n |
| **Manual Deployment**   | `guides/MANUAL_DEPLOYMENT_GUIDE.md`   | Step-by-step deploy process    |
| **PDF Generation**      | `guides/PDF_GENERATION.md`            | Resume PDF generation          |
| **Deployment Pipeline** | `architecture/DEPLOYMENT_PIPELINE.md` | CI/CD architecture             |

## Conventions

- **Markdown Format**: All docs in `.md` with frontmatter when needed
- **Naming**: `SCREAMING_SNAKE_CASE.md` for guides, `kebab-case.md` for notes
- **Date Prefix**: Reports use `YYYY-MM-DD-` prefix for chronological ordering
- **Relative Links**: Always use relative paths for cross-references

## Notes

- Historical docs may reference removed GitHub Actions configuration (migrated to GitHub Actions)
- Session notes in `sessions/` and `thoughts/` are ephemeral
- Vendor docs in `_vendor/` are external references (bmad methodology)
