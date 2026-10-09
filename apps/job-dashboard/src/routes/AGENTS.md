# ROUTES KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Dashboard route registration over the request-scoped handler context, with bounded health probes.

Scope reason: existing distinct API-wiring domain.

## WHERE TO LOOK

| Task                | Location          | Notes                                        |
| ------------------- | ----------------- | -------------------------------------------- |
| Registrar barrel    | `index.js`        | Public route registration exports            |
| Automation          | `automation.js`   | Automation and auto-apply paths              |
| Application records | `applications.js` | CRUD and approval operations                 |
| Authentication      | `auth.js`         | Login and session routes                     |
| Health/status       | `health.js`       | D1 probes and notification capability checks |
| Statistics          | `stats.js`        | Reporting endpoints                          |
| Workflow controls   | `workflows.js`    | Workflow status and operations               |
| Administration      | `admin.js`        | Configuration and admin helpers              |

## CONVENTIONS

- Each module exports a `registerXRoutes(router, ctx)` function.
- Most API paths use `/api/*`; health also registers `/health`.
- Registrars consume existing context handlers rather than constructing their own instances.
- Keep `/job` normalization in `../index.js`, not in individual path tables.
- `health.js` deliberately executes bounded database probes and shapes health responses inline.
- Keep route additions aligned with `packages/contracts/openapi.yaml` when part of the published API.

## ANTI-PATTERNS

- Do not instantiate duplicate handlers or services per registered route.
- Do not turn bounded health probes into application-domain persistence logic.
- Do not hide authentication assumptions inside route-local branches.
- Do not change a REST path without checking MCP's internal API consumers.

Parent: [../AGENTS.md](../AGENTS.md)
