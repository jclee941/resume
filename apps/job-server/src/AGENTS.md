# JOB AUTOMATION SOURCE KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Executable Node source for MCP, HTTP, crawler, session, and application flows.
Entry points compose; `shared/` owns reusable domain and adapter behavior.

## WHERE TO LOOK

| Task                 | Location                   | Notes                                      |
| -------------------- | -------------------------- | ------------------------------------------ |
| MCP bootstrap        | `index.js`                 | server construction, handlers, shutdown    |
| Tool registry        | `handlers/tools.js`        | list/call dispatch over tool `execute()`   |
| Fastify runtime      | `server/`                  | child guide owns plugins and routes        |
| Domain core          | `shared/`                  | services, repositories, clients, contracts |
| Browser search/apply | `crawlers/`, `auto-apply/` | child guides own safety rules              |
| Wanted renewal       | `session-broker/`          | encrypted session lifecycle                |

## CONVENTIONS

- Keep `index.js` and server entries limited to composition, registration, and
  lifecycle handling.
- Inject clients and state into services; use the Fastify services plugin as the
  HTTP composition root.
- Keep MCP tools, CLI handlers, and routes as inbound adapters.
- Import canonical implementations directly; compatibility shims only preserve
  shipped consumers and must not gain new logic.

## ANTI-PATTERNS

- Do not introduce another service locator or module-global singleton.
- Do not import dashboard Worker handlers into the Node server.
- Do not read credentials/session files from domain services without an adapter.
- Do not bypass typed validation at external input boundaries.

---

Parent: [../AGENTS.md](../AGENTS.md)
