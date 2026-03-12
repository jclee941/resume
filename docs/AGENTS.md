# DOCUMENTATION HUB KNOWLEDGE BASE

**Generated:** 2026-03-11
**Commit:** `ee9300d`
**Branch:** `master`

## OVERVIEW

Documentation is split by responsibility: durable decisions, current architecture, operator guides, planning artifacts, and historical analysis/report output.

## STRUCTURE

```text
docs/
├── adr/            # numbered architecture decisions
├── analysis/       # audits, gap analysis, generated deep reviews
├── api/            # API-specific reference docs
├── architecture/   # current system shape and implementation docs
├── guides/         # operational how-to guides
├── planning/       # roadmap and implementation planning
├── reports/        # historical completion/status reports
└── thoughts/       # design explorations and working notes
```

## WHERE TO LOOK

| Task                           | Location                          | Notes                                                    |
| ------------------------------ | --------------------------------- | -------------------------------------------------------- |
| Durable architecture decisions | `docs/adr/`                       | numbered ADRs + template                                 |
| Current system shape           | `docs/architecture/`              | verify against live code before trusting generated files |
| Operator runbooks              | `docs/guides/`                    | deployment, Cloudflare, monitoring, testing              |
| Planning / scope               | `docs/planning/`                  | roadmap and execution plans                              |
| Historical audits              | `docs/analysis/`, `docs/reports/` | useful context, not normative by default                 |

## CONVENTIONS

- Use one documentation domain per file; do not mix operator procedure, architecture rationale, and status reporting in a single doc.
- `docs/adr/` uses numbered filenames plus a template-driven format.
- `docs/guides/` contains operational docs and keeps many legacy uppercase filenames; preserve existing naming where already established.
- `docs/analysis/` and `docs/reports/` often contain generated or time-bound material; treat them as historical context unless promoted elsewhere.
- Prefer relative links when linking within the repo.

## ANTI-PATTERNS

- Never let docs drift silently when code/workflow ownership changes.
- Never use `docs/analysis/` or `docs/reports/` as the sole source of truth for live behavior.
- Never duplicate the same normative rule across multiple docs when one canonical file can own it.
- Never add repo paths, commands, or system components that do not exist in the current tree.

## NOTES

- `docs/architecture/system-overview.md` is generated and can lag behind the real repo; cross-check against `apps/`, `package.json`, and `.github/workflows/`.
- This file intentionally covers the docs tree at the domain level; avoid adding another child layer under `docs/guides/` unless guide-specific governance becomes materially distinct.
