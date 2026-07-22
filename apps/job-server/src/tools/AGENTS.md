# MCP TOOLS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

MCP-facing adapters registered by `handlers/tools.js`. Tool files define public
name/description/input schema and an `execute()` entry; domain logic stays below.

## WHERE TO LOOK

| Task              | Location                                           | Notes                                              |
| ----------------- | -------------------------------------------------- | -------------------------------------------------- |
| Registry/dispatch | `../handlers/tools.js`                             | imports default tool objects and calls `execute()` |
| Resume operations | `resume/`, `resume-sync.js`, `resume-generator.js` | multi-action adapters                              |
| Auth/session      | `auth/`, `auth.js`, `auth-integrated.js`           | security-sensitive adapters                        |
| Platform sync     | `platforms/`                                       | preview/mutation platform operations               |
| Search/apply      | `search-*.js`, `job-matcher.js`, `auto-apply.js`   | delegates to services                              |

## CONVENTIONS

- Default-export a tool object with `name`, `description`, `inputSchema`, and
  `execute` matching the registry contract.
- Parse and validate tool arguments before invoking a service.
- Return serializable result objects; registry code owns MCP text wrapping.
- Keep compatibility actions explicit and preserve published tool names.

## ANTI-PATTERNS

- Do not instantiate external clients or embed business rules in tools.
- Do not return credentials, cookies, auth headers, or raw session data.
- Do not change a tool schema without updating its implementation and tests.
- Do not call another tool as an internal service boundary.

---

Parent: [../AGENTS.md](../AGENTS.md)
