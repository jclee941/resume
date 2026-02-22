# DOCUMENTATION HUB KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Project documentation organized by purpose. Architecture decisions, guides, planning, and analysis.

## STRUCTURE

```text
docs/
├── guides/               # how-to guides (deployment, CF, etc.)
├── architecture/         # system design documents
├── analysis/             # gap analysis, audits
├── reports/              # date-prefixed reports
├── planning/             # roadmap, feature plans
├── sessions/             # session logs
├── thoughts/             # design explorations
└── _vendor/bmad/         # vendored framework (NOT project code)
```

## WHERE TO LOOK

| Task                  | Location                                  | Notes                   |
| --------------------- | ----------------------------------------- | ----------------------- |
| Deployment guide      | `guides/CLOUDFLARE_GITHUB_AUTO_DEPLOY.md` | CF Builds authority doc |
| Architecture overview | `architecture/`                           | system design docs      |
| Gap analyses          | `analysis/`                               | audit results           |
| Feature planning      | `planning/`                               | roadmap and specs       |

## CONVENTIONS

- Kebab-case filenames.
- Date-prefix for reports (`YYYY-MM-DD-`).
- Relative links between docs.
- `_vendor/bmad/` is vendored — ignore for project work.

## ANTI-PATTERNS

- Never let docs go stale — update with code changes.
- Never duplicate content across docs — single source.
- Never use external links where relative links work.
