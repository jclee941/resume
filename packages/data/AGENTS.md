# DATA KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Tracked resume schema, platform mapping data, and ownership guidance for materialized resume corpora.

Scope reason: existing distinct data-ownership domain.

## WHERE TO LOOK

| Task                  | Location                                        | Notes                                             |
| --------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Master schema         | `resumes/master/resume_schema.json`             | Tracked structural contract                       |
| Resume ownership      | `resumes/AGENTS.md`                             | Canonical versus independent materialized content |
| Role variants         | `resumes/applications/AGENTS.md`                | Deliberately separate minimum contract            |
| Platform categories   | `platforms/jobkorea-categories.js`              | Tracked platform mapping                          |
| Proposal states       | `proposals/`                                    | Tracked placeholders for proposal lifecycle       |
| Materialization rules | `../../tools/scripts/content/content-pack.json` | Manifest includes and exceptions                  |
| Sync implementation   | `../../tools/scripts/utils/sync-resume-data.js` | Master-to-portfolio generation                    |

## CONVENTIONS

- The package has no `main`, `exports`, or script entry; consumers use its data paths.
- Canonical locale JSON lives under materialized `resumes/master/`.
- The tracked tree does not contain the full resume corpus; schema, guides, and placeholders survive separately.
- Platform mappings belong outside the private resume tree when they contain only generic catalog values.
- Role-specific variants have their own contract rather than automatic master parity.
- Proposal lifecycle placeholders represent approved/applied/rejected states, not deployed runtime storage.

## ANTI-PATTERNS

- Do not label materialized generated documents as tracked source outputs.
- Do not use workstation-absolute paths inside data references.
- Do not treat old archive or proposal content as the current canonical resume.
- Do not add executable orchestration to this data-only package.

Parent: [../AGENTS.md](../AGENTS.md)
