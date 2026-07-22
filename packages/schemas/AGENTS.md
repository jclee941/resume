# SCHEMAS PACKAGE KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

**Package:** `@resume/schemas`
**Type:** Runtime validation (Zod)

## OVERVIEW

Runtime validation owner for untrusted inputs across the monorepo. Zod schemas
mirror canonical domain contracts owned by `@resume/types` and add boundary-specific
portfolio, application, authentication, and webhook validation.

## STRUCTURE

```text
packages/schemas/src/
├── index.js                    # Barrel re-export
├── common.js                  # idSchema, platformSchema, koreanPhoneSchema, emailSchema, isoTimestampSchema
├── application.js              # applicationCreate/Update/StatusUpdate + VALID_APPLICATION_STATUSES
├── application-core.js         # Core application domain schemas
├── application-dashboard.js    # Dashboard-specific application schemas
├── foreign-ats-application.js  # Foreign ATS application schemas
├── portfolio.js                # Portfolio-specific schemas
├── resume.js                   # resumeSchema + sub-schemas (profile, career, project, skill)
├── auth.js                     # adminLoginSchema, platformSessionSchema, sessionStateSchema
└── webhook.js                  # webhookSignatureHeaderSchema, notificationPayloadSchema
```

## CONVENTIONS

- Zod is the only runtime dep. No `joi`, `yup`, `ajv`, etc.
- Keep domain ownership in `@resume/types`; schemas validate those shapes at
  runtime rather than redefining their conceptual contract.
- Keep published API behavior aligned with `packages/contracts/openapi.yaml`, but
  do not treat every internal schema as a published API contract.

## ANTI-PATTERNS

- Never `.parse()` user input outside an HTTP boundary. Pass already-validated data through internal functions.
- Never silently `.safeParse()` and ignore errors. Log them or propagate.
- Never make schemas the second owner of a domain type already defined in
  `@resume/types`.

---

Parent: [../AGENTS.md](../AGENTS.md)
