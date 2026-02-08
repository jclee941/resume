# DOCUMENTATION DIRECTORY

> Parent: [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-02-09
**Commit:** 29d46c2
**Branch:** master

## OVERVIEW

Project documentation hub: deployment guides, architecture decisions, analysis reports, workflow documentation.

## STRUCTURE

```
docs/
├── guides/              # Step-by-step deployment & setup guides
├── architecture/        # System design, ADRs, technical decisions
├── analysis/            # Code analysis, performance reports
├── reports/             # Generated reports, audits
├── planning/            # Project planning, roadmaps
├── sessions/            # Development session notes
├── thoughts/            # AI session ledgers (ephemeral)
└── _vendor/             # ⚠️ External methodology framework (NOT project code)
```

## WHERE TO LOOK

| Task                 | Location                               | Notes                           |
| -------------------- | -------------------------------------- | ------------------------------- |
| **Deployment Guide** | `guides/deployment.md`                 | Full CI/CD pipeline docs        |
| **Workflow Setup**   | `guides/workflow-*.md`                 | n8n, automation setup           |
| **Architecture**     | `architecture/`                        | ADRs, system design             |
| **Figma Tokens**     | `figma-tokens.json`                    | Design system tokens            |
| **Analysis Reports** | `analysis/`                            | Code complexity, coverage       |
| **Requirements**     | `*.requirements.md`                    | Feature specification docs      |
| **CF Workflows**     | `cloudflare-workflows-requirements.md` | Workflow requirements checklist |

## CONVENTIONS

- **Markdown Format**: All docs in `.md` with frontmatter when needed
- **Naming**: `kebab-case` for all filenames
- **Date Prefix**: Reports use `YYYY-MM-DD-` prefix for chronological ordering
- **Relative Links**: Always use relative paths for cross-references
- **Telegraphic Style**: Match root project's density-over-verbosity approach

## ANTI-PATTERNS

- **Stale Docs**: Delete or update outdated documentation; don't leave stale content
- **Duplicate Content**: Reference root `AGENTS.md` instead of duplicating info
- **External Links**: Prefer local docs; external links may rot
- **Generated Files**: Don't manually edit files in `reports/` (auto-generated)

## NOTES

- `figma-tokens.json` contains design system export from Figma
- Session notes in `sessions/` are ephemeral; archive or delete after use
- ADRs in `architecture/` follow standard ADR format (Status, Context, Decision, Consequences)
- **⚠️ `_vendor/bmad/`**: Massive vendored BMAD methodology framework (agents, workflows, game dev). NOT project code. Do NOT modify, do NOT reference as project patterns. Ignore during code analysis.
