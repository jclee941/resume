# SCRIPTS UTILS KNOWLEDGE BASE

## OVERVIEW

Utility scripts provide reusable automation helpers for versioning, resume data sync/validation, and supporting review/generation tasks.

## WHERE TO LOOK

| Task                  | Location                  | Notes                         |
| --------------------- | ------------------------- | ----------------------------- |
| SSoT sync runner      | `resume-sync-runner.js`   | orchestrates sync execution   |
| Resume path constants | `resume-data-paths.js`    | canonical data paths          |
| Data sync             | `sync-resume-data.js`     | SSoT propagation helper       |
| Data validation       | `validate-resume-data.js` | schema and consistency checks |
| Version bumping       | `bump-version.js`         | version increment utility     |

## CONVENTIONS

- Run utilities from repository root unless script explicitly states otherwise.
- Keep utilities composable and deterministic for CI reuse.
- Read/write resume data via canonical path helpers, not ad hoc relative paths.
- Fail fast with clear exit codes and actionable error messages.

## ANTI-PATTERNS

- Do not edit derived artifacts directly; regenerate from SSoT inputs.
- Do not hardcode environment-specific absolute paths.
- Do not hide partial failures behind success exit codes.
- Do not couple unrelated utility concerns into a single script.
