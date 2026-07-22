# TYPES PACKAGE KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

**Package:** `@resume/types`
**Type:** Dependency-light JSDoc domain contracts and runtime constants

## OVERVIEW

Canonical owner for shared domain typedefs, constants, and small pure helpers.
The package is plain JavaScript with JSDoc contracts so JS consumers receive
TypeScript Language Service checking without a runtime validation dependency.

## STRUCTURE

```text
packages/types/src/
├── index.js           # Barrel re-export
├── application.js     # Application, ApplicationStatus, APPLICATION_STATUSES
├── env.js             # WorkerEnv, PortfolioEnv, JobDashboardEnv (CF bindings)
├── job-categories.js  # JOB_CATEGORY_BY_NAME, JOB_CATEGORY_BY_KEY (canonical)
├── notification.js    # NotificationJob, NotificationPriority, NotificationType
├── queue.js           # Queue job types
├── resume.js          # Resume, ResumeProfile, ResumeCareer, ResumeProject, ResumeSkill
├── session.js         # PlatformSession, AdminSession, WebhookSignature
└── wanted.js          # WantedJob, WantedJobDetail, WantedCompany + normalize* functions
```

## CONVENTIONS

- Keep zero external runtime dependencies. I/O, crypto, and network clients belong
  in `@resume/shared`.
- Define canonical domain shapes with JSDoc; runtime constants and pure
  normalization/predicate helpers may accompany those contracts.
- Constants are `Object.freeze`d to prevent accidental mutation across consumers.
- Backward-compat aliases marked `@deprecated` with canonical replacement named in message.

## ANTI-PATTERNS

- Never add I/O or environment-dependent runtime behavior here.
- Never duplicate a domain typedef in `@resume/shared` or an app. Consolidate it
  here, then import the canonical contract.
- Never put validation logic here. That lives in `@resume/schemas`.

---

Parent: [../AGENTS.md](../AGENTS.md)
