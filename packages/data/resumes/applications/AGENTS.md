# APPLICATIONS — INTENTIONALLY INDEPENDENT

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

**Scope:** `packages/data/resumes/applications/`
**Status:** Hand-crafted, not derived from master SSoT

## Why these are not generated from master

Files under this directory (e.g. `shinhan/shinhan_resume_data.json`, `toss/toss_devops_engineer_resume.md`, `yanolja/cover_letter.md`) are role-specific resume and cover letter variants. They use a different schema than master (skills is a nested-by-category object, not a flat array; only ~9 of 22 master top-level keys exist), contain rewritten career descriptions tailored to the target role, and include prose narrative (cover letters, Q&A docs) that has no programmatic source.

Per commit `7f03f11`, master/ is the canonical SSoT for portfolio and automated platform sync, while applications/ is intentionally outside that pipeline.

## The contract enforced

`tools/scripts/utils/validate-application-variants.js` (CI-wired) enforces only the minimum contract that downstream tooling (PDF generator, build pipeline) depends on:

- `personal`, `summary`, `careers`, `projects`, `skills`, `certifications` top-level keys MUST exist
- `personal.name`, `personal.email`, `personal.phone` MUST be non-empty
- `careers[]` items MUST have `company` and `period`
- `skills` MUST be a non-empty object (application-variant convention)

The contract does NOT enforce master parity. Career descriptions, skills categories, and `summary.expertise` arrays are intentionally allowed to diverge per role.

## Anti-patterns

- Do NOT add files here that are auto-generated from master. Those belong in `packages/data/resumes/master/`, `generated/`, or build outputs.
- Do NOT extend `tools/scripts/utils/sync-resume-data.js` to mirror changes here. Sync covers ko/en/ja master locales only.
- Do NOT rewrite the contract validator to enforce the master 22-key shape. That defeats the intentional independence.

## Adding a new application variant

1. Create a directory under `applications/` named after the company (e.g. `applications/toss/`).
2. Copy `shinhan/shinhan_resume_data.json` as a starting template.
3. Rewrite content per role.
4. Run `node tools/scripts/utils/validate-application-variants.js` locally before committing. CI will fail if the contract is broken.
5. Cover letters and Q&A docs go alongside as `.md` files (no contract).

---

Parent: [../AGENTS.md](../AGENTS.md)
