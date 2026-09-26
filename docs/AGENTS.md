# DOCUMENTATION HUB KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Documentation is split by responsibility: durable decisions, current
architecture, operator guides, planning artifacts, and historical
analysis/report output.

## STRUCTURE

```text
docs/
├── adr/            # numbered architecture decisions
├── api/            # API-specific reference docs
├── architecture/   # current system shape and implementation docs
├── conventions/    # shared engineering conventions and style guides
├── guides/         # operational how-to guides
├── runbooks/       # incident and operator runbooks
└── security/       # secret management and security procedures
```

## WHERE TO LOOK

| Task                           | Location                         | Notes                                                    |
| ------------------------------ | -------------------------------- | -------------------------------------------------------- |
| Durable architecture decisions | `docs/adr/`                      | numbered ADRs + template                                 |
| Current system shape           | `docs/architecture/`             | verify against live code before trusting generated files |
| Operator runbooks              | `docs/guides/`, `docs/runbooks/` | deployment, Cloudflare, monitoring, testing, runbooks    |
| Shared conventions             | `docs/conventions/`              | architecture rules, resume phrasing guides               |
| Security procedures            | `docs/security/`                 | secret rotation, posture, and credential guides          |

## CONVENTIONS

- Use one documentation domain per file; do not mix operator procedure,
  architecture rationale, and status reporting in a single doc.
- `docs/adr/` uses numbered filenames plus a template-driven format.
- `docs/guides/` contains operational docs and keeps many legacy uppercase
  filenames; preserve existing naming where already established.
- Historical audits and session reports have been archived; consult Git history
  for time-bound context unless promoted elsewhere.
- Prefer relative links when linking within the repo.

## ANTI-PATTERNS

- Never let docs drift silently when code/workflow ownership changes.
- Never use historical records or audits as the sole source of truth for
  live behavior.
- Never duplicate the same normative rule across multiple docs when one
  canonical file can own it.
- Never add repo paths, commands, or system components that do not exist in the
  current tree.

## NOTES

- `docs/architecture/system-overview.md` is generated and can lag behind the
  real repo; cross-check against `apps/`, `package.json`, and
  `.github/workflows/`.
- This file intentionally covers the docs tree at the domain level; avoid adding
  another child layer under `docs/guides/` unless guide-specific governance
  becomes materially distinct.

---

Parent: [../AGENTS.md](../AGENTS.md)
