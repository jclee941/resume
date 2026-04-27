# TYPES PACKAGE KNOWLEDGE BASE

**Package:** `@resume/types`
**Type:** Pure TypeScript type definitions (zero runtime deps)

## OVERVIEW

Canonical SSoT for shared types across the monorepo. JSDoc `@typedef`-based so it works
identically in plain JS files (with TS Language Service) and in `.ts` files.

Consumed by `apps/portfolio`, `apps/job-server`, `apps/job-dashboard`,
`packages/shared`, `packages/schemas`, `packages/contracts`.

## STRUCTURE

```text
packages/types/
└── src/
    ├── index.js           # barrel re-export
    ├── application.js     # Application, ApplicationStatus, APPLICATION_STATUSES
    ├── env.js             # WorkerEnv, PortfolioEnv, JobDashboardEnv (CF bindings)
    ├── gitlab.js          # GitLab API v4 types
    ├── job-categories.js  # JOB_CATEGORY_BY_NAME, JOB_CATEGORY_BY_KEY (canonical)
    ├── notification.js    # NotificationJob, NotificationPriority, NotificationType
    ├── resume.js          # Resume, ResumeProfile, ResumeCareer, ResumeProject, ...
    ├── session.js         # PlatformSession, AdminSession, WebhookSignature
    └── wanted.js          # WantedJob, WantedJobDetail, WantedCompany + normalize* fns
```

## CONVENTIONS

- **Zero runtime dependencies.** Anything that needs `node:crypto` or `fetch` belongs
  elsewhere (see `@resume/shared`).
- **JSDoc `@typedef` only.** No actual `.d.ts` files; the entire surface is
  expressed as JSDoc so it tree-shakes to nothing in JS bundles.
- **Constants are `Object.freeze`d.** Prevents accidental mutation across consumers.
- **Backward-compat aliases marked `@deprecated`** with the canonical replacement
  named in the message.

## ANTI-PATTERNS

- Never add `import` of a runtime module here. Types only.
- Never duplicate a typedef that already exists in `@resume/shared` or an app —
  consolidate INTO this package, then re-import.
- Never put validation logic here — that lives in `@resume/schemas`.

## FUTURE

- A future migration to true `.d.ts` files is straightforward — every typedef
  has a 1:1 `.d.ts` translation. Tracked in SSOT plan as part of D-4.
