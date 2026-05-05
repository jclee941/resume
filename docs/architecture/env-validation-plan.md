# Type-Safe Env Validation Plan — Issues #34, #35 / SSOT-029, SSOT-031

**Status**: Active plan · **Owner**: Platform · **Last Updated**: 2026-05-05

This document plans the introduction of type-safe environment variable
validation across the monorepo (#34) and the CI gate that ensures declared
env vars exist in the secrets store (#35).

These two issues are tightly coupled — #35 cannot start until #34 has
established the canonical schema source. They are planned together here.

---

## Goal

- **Boot fails at build/startup if a required env var is missing**, with a
  clear error message naming the missing key.
- **Type-safe access** at every call site (`env.X` is auto-completed and
  type-checked).
- **No drift** between the schema declaration and the secrets store.

---

## Stack Choice

`t3-env` (the original SSOT-029 proposal) is one option. The alternatives:

| Tool                   | Pros                                                          | Cons                                    |
| ---------------------- | ------------------------------------------------------------- | --------------------------------------- |
| `t3-env`               | Type-safe; popular; supports both Node and Worker; Zod schema | Adds a runtime dep (`@t3-oss/env-core`) |
| `@valibot/env`         | Smaller bundle; same shape                                    | Less ecosystem                          |
| Hand-rolled Zod schema | Already have Zod via `packages/schemas`                       | More code, but no new dep               |

**Decision**: hand-rolled Zod schema in a new `packages/env/` package. We
already have Zod via `packages/schemas`; adding `@t3-oss/env-core` is net
new bundle weight per Worker. The hand-rolled approach is ~30 LOC per
app and reuses our existing tooling.

---

## Canonical Home Structure

```text
packages/env/
├── package.json            # @resume/env
├── src/
│   ├── index.js            # barrel
│   ├── parse.js            # validateEnv(schema, source) helper
│   └── schemas/
│       ├── portfolio.js    # apps/portfolio Worker env schema
│       ├── job-dashboard.js  # apps/job-dashboard Worker env schema
│       └── job-server.js   # apps/job-server Node env schema
└── __tests__/
    ├── parse.test.js
    └── schemas/
        ├── portfolio.test.js
        ├── job-dashboard.test.js
        └── job-server.test.js
```

Per-app usage:

```js
// apps/job-dashboard/src/index.js
import { validateEnv } from '@resume/env';
import { jobDashboardEnvSchema } from '@resume/env/schemas/job-dashboard';

export default {
  async fetch(request, rawEnv, ctx) {
    const env = validateEnv(jobDashboardEnvSchema, rawEnv);
    // env is now typed + validated; missing required vars throw at boot
    // ...
  },
};
```

---

## CI Gate (#35)

A Go script under `tools/ci/check-env-secrets-drift.go` reads each schema
from `packages/env/src/schemas/*.js` (via a small JSON descriptor written
alongside each schema for non-JS-runtime tooling) and asserts every
**required** env var exists in:

- The corresponding `.dev.vars.example` file (per-app committed),
- The CI environment (so deploys do not boot-fail),
- The Cloudflare Workers secrets store (queried via wrangler API).

The script fails CI when a required key is declared in a schema but
missing from any of the three stores. Optional env vars are tolerated.

The script never logs secret values; it only enumerates names.

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Decide stack: hand-rolled Zod in `packages/env/` (avoids new dep
      bundle weight per Worker; reuses existing Zod from `packages/schemas`).
- [x] Decide structure: per-app schemas under `packages/env/src/schemas/`.
- [x] Decide CI gate shape: Go script that compares schema declarations
      against `.dev.vars.example` + CI env + wrangler secret listing.

### Phase 2 (follow-up PR — package + portfolio schema first)

- [ ] Create `packages/env/` workspace package.
- [ ] Implement `validateEnv` and the portfolio schema.
- [ ] Wire into `apps/portfolio/lib/env.js` (the existing env-validation
      point).
- [ ] Add `*.test.js` covering: required-present, required-missing,
      optional-default, type-coercion (`"true"` → `true`).

### Phase 3 (follow-up PR — extend to job-dashboard + job-server)

- [ ] Add `job-dashboard.js` and `job-server.js` schemas.
- [ ] Wire each app's bootstrap to call `validateEnv`.

### Phase 4 (follow-up PR — CI drift check, #35)

- [ ] Add `tools/ci/check-env-secrets-drift.go`.
- [ ] Wire into `.github/workflows/ci.yml` as a new `env-drift` job that
      fails on missing required keys.
- [ ] Document in `docs/security/wrangler-vars-vs-secrets.md`.

---

## Acceptance Criteria

- [ ] Required missing env var → app boot fails with a clear error.
- [ ] Type-safe access at every call site.
- [ ] CI gate fails when a required key is declared but missing from CI /
      `.dev.vars.example` / wrangler secrets.
- [ ] No secret values logged in CI output.

---

## Verification (this PR)

This PR adds the plan only — no code changes. Phase 2 implements the
package; Phase 3 extends to all apps; Phase 4 lands the CI gate.

---

## See Also

- [`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`](./SSOT_IMPROVEMENT_PLAN.md)
  § SSOT-029, SSOT-031 — original entries.
- [`docs/security/wrangler-vars-vs-secrets.md`](../security/wrangler-vars-vs-secrets.md)
  — boundary policy and rotation cadence (Phase 4 cross-references this).
- [`packages/schemas/`](../../packages/schemas/) — existing Zod schema
  package; `packages/env/` will reuse the same Zod runtime.
