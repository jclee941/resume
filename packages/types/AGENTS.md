# TYPES PACKAGE KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

JSDoc domain contracts, frozen constants, and small pure normalization helpers.

Scope reason: score 9; distinct domain-contract package.

## WHERE TO LOOK

| Task                   | Location                              | Notes                                                          |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------- |
| Export surface         | `src/index.js`, `package.json`        | Barrel plus per-module subpaths                                |
| Application domain     | `src/application.js`                  | `Application`, `ApplicationStatus`, `APPLICATION_STATUSES`     |
| Binding typedefs       | `src/env.js`                          | Worker/portfolio/dashboard environments and marker             |
| Workflow ambient types | `src/cloudflare-workers.d.ts`         | Strict-check subset, not a barrel export                       |
| Resume domain          | `src/resume.js`                       | `ResumePersonal`, career/project/skill and education contracts |
| Wanted data            | `src/wanted.js`                       | Raw and normalized job/company types with normalizers          |
| Notifications/queues   | `src/notification.js`, `src/queue.js` | Payload contracts and constants                                |
| Session domain         | `src/session.js`                      | Platform/admin sessions and webhook signatures                 |
| Categories             | `src/job-categories.js`               | Canonical category indexes and default                         |

## CONVENTIONS

- Plain JavaScript plus JSDoc supplies language-service types; there is no TypeScript source build.
- Keep zero external runtime dependencies.
- Freeze shared constant collections to prevent cross-consumer mutation.
- Small pure normalizers may accompany the type they normalize.
- Export-map subpaths mirror domain files; update them with any public module changes.
- Strict typechecking explicitly includes the ambient Workflow declaration file.
- Use `npm run typecheck` and `npm run typecheck:strict`; this package has no local test script.

## ANTI-PATTERNS

- Do not add I/O or environment-dependent runtime initialization here.
- Do not replace `ResumePersonal` with the nonexistent `ResumeProfile` name.
- Do not add network or cryptography clients beside typedefs.
- Do not assume the ambient Workflow declarations are runtime exports.

Parent: [../AGENTS.md](../AGENTS.md)
