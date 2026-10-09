# SCRIPTS UTILS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Locale-data synchronization, validation, path handling, version utilities, and the standalone job-search CLI.

Boundary: retained reusable data-generation domain with explicit source and output boundaries.

## WHERE TO LOOK

| Task                     | Location                                                         | Notes                                      |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------ |
| Sync CLI                 | `sync-resume-data.js`                                            | Root `sync:data` entry                     |
| Canonical paths          | `resume-data-paths.js`                                           | Locale source/output manifest              |
| Sync orchestration       | `resume-sync-runner.js`                                          | Validation, generation, cleanup            |
| Derived fields           | `resume-sync-derivations.js`                                     | Experience and period derivation           |
| Safe outputs             | `resume-sync-output.js`, `secure-directory.js`                   | Directory identity and publication         |
| Web projections          | `resume-web-data-generator.js`, `resume-web-data-projections.js` | Portfolio snapshots                        |
| Data validation          | `validate-resume-data.js`, `json-schema-lite-*.js`               | Schema and diagnostics                     |
| Variant contracts        | `validate-application-variants.js`                               | Independent application-variant validation |
| Parity verification      | `verify-resume-sync.mjs`                                         | Root `verify:ssot` entry                   |
| Other operator utilities | `bump-version.js`, `record-demo-video.js`, `auto-job-search/`    | Version, capture, search                   |

## CONVENTIONS

- Most modules are CommonJS; `verify-resume-sync.mjs` is ESM.
- Tests under `__tests__/` run through `npm run test:tools`, not Jest.
- Use `resume-data-paths.js` for canonical reads and writes rather than duplicating path strings.
- The sync manifest must contain exactly ko/en/ja and the corresponding three portfolio output names.
- Validate every source before preparing output directories or generating locale snapshots.
- Preserve explicit as-of-date handling for deterministic derived experience fields.
- Output helpers bind directory identity, clean partially written snapshots on error, and close handles.
- Keep application-variant validation distinct from the canonical master schema.

## ANTI-PATTERNS

- Do not bypass secure-directory checks with ad hoc filesystem writes.
- Do not write derived portfolio fields back into canonical source files.
- Do not hide a partial locale-generation failure behind a success exit code.
- Do not couple unrelated operator concerns merely because they share this directory.

---

Parent: [../AGENTS.md](../AGENTS.md)
