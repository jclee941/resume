# Validator 4-Way Duplication Triage — Issue #17 / P2-8

**Status**: Active triage · **Owner**: Platform · **Last Updated**: 2026-05-05

This document maps the four validation modules in the monorepo (~937 LOC of
overlapping logic) and prescribes the consolidation path into
`packages/shared/validation/`. It also delineates the boundary between this
ticket and SSOT-036 / #45 (Validation primitives).

---

## Inventory

|   # | Path                                                                                             |   LOC | Authority                                                                                    | Domain                                  |
| --: | ------------------------------------------------------------------------------------------------ | ----: | -------------------------------------------------------------------------------------------- | --------------------------------------- |
|   1 | `apps/job-server/src/shared/validation/`                                                         | ≈ 280 | resume schema (delegates to `tools/scripts/utils/validate-resume-data.js` since #17 round 1) | resume_data, MCP responses              |
|   2 | `apps/job-dashboard/src/utils/validators.js` (renamed from `apps/job-dashboard/src/validation/`) | ≈ 220 | hand-rolled API payload validation (no Zod)                                                  | application create/update/status update |
|   3 | `packages/schemas/src/`                                                                          | ≈ 250 | Zod schemas (canonical `application`, `auth`, `webhook`, `common`, `resume`)                 | cross-app domain schemas                |
|   4 | `tools/scripts/utils/validate-resume-data.js`                                                    | ≈ 187 | CJS engine implementing JSON-Schema-style checks against `resume_schema.json`                | resume_data CLI/CI validation           |

---

## Overlap vs Domain Distinction

| Concern                            | Authority today                                   | Decision                                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resume payload validation          | #1 (delegates to #4)                              | **Already consolidated** in Round 1 of this ticket. Both #1 and #4 share `resume_schema.json` + `SimpleValidator` engine. No further action; only documentation.                                                                                                |
| Application API payload validation | #2 (hand-rolled)                                  | Migrate to consume `applicationCreateSchema` / `applicationUpdateSchema` / `applicationStatusUpdateSchema` from #3 (`packages/schemas`). Bundle-size concern from the comment in `validators.js` is moot now that Zod is already a workspace dependency for #3. |
| Cross-app domain schemas           | #3 (Zod, canonical)                               | Already canonical. Confirm full coverage of: application status enum, platform enum, ID/timestamp primitives.                                                                                                                                                   |
| Resume schema authority            | `packages/data/resumes/master/resume_schema.json` | **JSON Schema is canonical**, Zod schemas in #3 are an additional surface for runtime validation. The two surfaces co-exist (per ADR 0003).                                                                                                                     |

---

## Decision

The **canonical home is `packages/schemas/`** (Zod) for runtime validation
schemas. `packages/shared/validation/` is **not** the right canonical
location — `packages/schemas/` already exists and owns the cross-app
validation surface.

The redirection vs the issue body wording:

> Target structure: `packages/shared/validation/`

The issue body predates the creation of `packages/schemas/`. Consolidation
happens **into `packages/schemas/`**, not into a new
`packages/shared/validation/`.

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Inventory four validation modules.
- [x] Document that #1 + #4 are already consolidated (Round 1).
- [x] Decide canonical home: **`packages/schemas/`** (existing), not
      `packages/shared/validation/` (issue body's outdated target).
- [x] Identify remaining duplication: #2 (job-dashboard hand-rolled) duplicates
      what #3 already provides as Zod schemas.

### Phase 2 (follow-up PR — job-dashboard migration)

- [ ] Replace `validateApplicationCreate`, `validateApplicationUpdate`,
      `validateStatusUpdate` in `apps/job-dashboard/src/utils/validators.js`
      with thin wrappers that call the corresponding Zod schemas from
      `@resume/schemas`. Preserve the `{ valid, data?, errors? }` return shape
      so call sites do not change.
- [ ] Add unit tests covering the wrapper-shape preservation
      (`tests/unit/job-dashboard/validators.test.js`).
- [ ] Verify Cloudflare Worker bundle size after Zod is included
      (the rate-limit binding bundle should still be under 1100 KB).
- [ ] Delete the stand-alone `isValidUrl` helper; use Zod's
      `z.string().url()` instead.

### Phase 3 (audit) — separate ticket

- [ ] Confirm `packages/schemas/` covers every domain entity referenced by
      any app's runtime validation.
- [ ] Update `packages/schemas/AGENTS.md` to spell out the relationship to
      `packages/data/resumes/master/resume_schema.json` (JSON Schema canonical;
      Zod runtime).

---

## Boundary with SSOT-036 / #45

- **#45 (SSOT-036)**: "Validation primitives" — focused on shared
  `validateRequired` / `validateString` / `validateEnum` low-level helpers.
  After this consolidation those primitives are subsumed by Zod's built-in
  combinators (`z.string().min().max()`, `z.enum([...])`, etc.) and **#45
  becomes redundant** — its acceptance is satisfied by this PR's Phase 2
  outcome.
- **#17 (this ticket)**: addresses the four-way duplication of _schemas_,
  not individual primitives.

The recommendation is to close #45 once Phase 2 of this ticket lands; the
job-dashboard migration replaces #45's "primitives" with Zod combinators in
the canonical location.

---

## Verification (this PR)

This PR adds the triage doc only — no code changes. It documents that
Round 1 of #17 already consolidated modules #1 + #4; the remaining
duplication is module #2 vs module #3, addressed in Phase 2. The issue
stays open until Phase 2 lands.

---

## See Also

- [`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`](./SSOT_IMPROVEMENT_PLAN.md)
  § SSOT-023, SSOT-036 — relevant entries.
- [`packages/schemas/AGENTS.md`](../../packages/schemas/AGENTS.md) —
  canonical Zod schema package.
- [`packages/data/resumes/master/resume_schema.json`](../../packages/data/resumes/master/resume_schema.json)
  — JSON Schema authority for resume_data.
- [`tools/scripts/utils/validate-resume-data.js`](../../tools/scripts/utils/validate-resume-data.js)
  — `SimpleValidator` engine shared between CI and runtime (#1 + #4
  consolidation).
- Issue #45 (SSOT-036) — to be closed when Phase 2 of this ticket lands.
