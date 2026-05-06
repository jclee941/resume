# SCHEMAS PACKAGE KNOWLEDGE BASE

**Generated:** 2026-05-06
**Commit:** `HEAD`
**Branch:** `master`

**Package:** `@resume/schemas`
**Type:** Runtime validation (Zod)

## OVERVIEW

Single source of truth for runtime validation across the monorepo. Schemas are
defined with Zod and consumed at HTTP boundaries (handlers, webhooks, CLI).

Apps that previously hand-rolled validators (`apps/portfolio/lib/validators.js`,
`apps/job-dashboard/src/utils/validators.js`, `apps/job-server/src/shared/validation/`)
now thin-wrap these schemas.

## STRUCTURE

```text
packages/schemas/
└── src/
    ├── index.js          # barrel re-export
    ├── common.js         # idSchema, platformSchema, koreanPhoneSchema, emailSchema, isoTimestampSchema
    ├── application.js    # applicationCreate/Update/StatusUpdate + VALID_APPLICATION_STATUSES
    ├── resume.js         # resumeSchema + sub-schemas (profile, career, project, skill, ...)
    ├── auth.js           # adminLoginSchema, platformSessionSchema, sessionStateSchema
    └── webhook.js        # webhookSignatureHeaderSchema, notificationPayloadSchema, ...
```

## CONVENTIONS

- **Zod is the only runtime dep.** No `joi`, `yup`, `ajv`, etc.
- **Types inferred from schemas** via `z.infer<typeof X>` — never duplicate the
  type definition. If a type already exists in `@resume/types`, replace it with
  `z.infer<>` here and re-export from `@resume/types` if needed.
- **Schemas are the SSoT for API contracts.** Anything documented in
  `apps/job-server/openapi.yaml` (now `packages/contracts/openapi.yaml`) MUST
  have a matching schema here.

## ANTI-PATTERNS

- Never `.parse()` user input outside an HTTP boundary — pass already-validated
  data through internal functions.
- Never silently `.safeParse()` and ignore errors — log them or propagate.
- Never re-define types in consumer code — import from here.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
