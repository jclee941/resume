# APPLICATIONS — INTENTIONALLY INDEPENDENT

**Scope**: `packages/data/resumes/applications/`

**Status**: hand-crafted, **not derived from master SSoT**

## Why these are not generated from master

Files under this directory (e.g. `shinhan/shinhan_resume_data.json`,
`toss/toss_devops_engineer_resume.md`, `yanolja/cover_letter.md`) are
**role-specific resume + cover letter variants**. They:

- use a **different schema** than master (`skills` is a nested-by-category
  object — not a flat array; only ~9 of 22 master top-level keys exist)
- contain **rewritten career descriptions** tailored to the target role
  (e.g. `_security` variant emphasises SIEM/incident response;
  `_java` variant emphasises Spring/Java security)
- include **prose narrative** (`.md` cover letters, Q&A application docs)
  that has no programmatic source

Per commit `7f03f11` ("consolidate SSoT — relocate shinhan variants"),
master/ is the canonical SSoT for the portfolio + automated platform sync,
and applications/ is intentionally outside that pipeline.

## The contract enforced

`tools/scripts/utils/validate-application-variants.js` (CI-wired) enforces
ONLY the minimum contract that downstream tooling (PDF generator, build
pipeline) depends on:

- `personal`, `summary`, `careers`, `projects`, `skills`, `certifications`
  top-level keys MUST exist
- `personal.name`, `personal.email`, `personal.phone` MUST be non-empty
- `careers[]` items MUST have `company` and `period`
- `skills` MUST be a non-empty object (application-variant convention)

The contract does **NOT** enforce master parity. Career descriptions,
skills categories, and `summary.expertise` arrays are intentionally allowed
to diverge per role.

## Anti-patterns

- ❌ Do NOT add files here that are auto-generated from master — those
  belong in `packages/data/resumes/master/`, `generated/`, or build outputs.
- ❌ Do NOT extend `tools/scripts/utils/sync-resume-data.js` to mirror
  changes here — sync covers ko/en/ja master locales only.
- ❌ Do NOT rewrite the contract validator to enforce the master
  22-key shape — that defeats the intentional independence.

## Adding a new application variant

1. Create a directory under `applications/` named after the company
   (e.g. `applications/toss/`).
2. Copy `shinhan/shinhan_resume_data.json` as a starting template.
3. Rewrite content per role.
4. Run `node tools/scripts/utils/validate-application-variants.js` locally
   before committing — CI will fail if the contract is broken.
5. Cover letters / Q&A docs go alongside as `.md` files (no contract).

## Related

- Audit: `docs/architecture/RESUME_SYNC_AUDIT_2026-04-29.md` Issue C
- CI job: `.github/workflows/ci.yml` `validate-data`
- Master SSoT: `packages/data/resumes/master/AGENTS.md` (or root data AGENTS.md)
