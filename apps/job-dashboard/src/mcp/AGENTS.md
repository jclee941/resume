# MCP KNOWLEDGE BASE

**Generated:** 2026-10-14
**Commit:** `493d44f6`
**Branch:** `master`

## OVERVIEW

Stateless Streamable HTTP MCP transport with route-backed operations and direct D1 content reads.

Scope reason: score 4; distinct protocol, authentication, and tool-result boundary.

## WHERE TO LOOK

| Task              | Location                                                                          | Notes                                    |
| ----------------- | --------------------------------------------------------------------------------- | ---------------------------------------- |
| Request lifecycle | `handler.js`, `server.js`                                                         | SDK handler and fresh server per request |
| Guard             | `guard.js`                                                                        | Host/Origin, method, then admin Bearer   |
| REST bridge       | `internal-api.js`                                                                 | Internal requests to the existing router |
| Tool registration | `tool-kit.js`, `results.js`                                                       | Annotations and structured errors        |
| Operations        | `tools/application-tools.js`, `tools/automation-tools.js`, `tools/write-tools.js` | Route-backed tool groups                 |
| Content reads     | `tools/content-files.js`                                                          | Read-only D1 queries, bounded body size  |
| Protocol coverage | `__tests__/mcp-protocol.test.js`, `__tests__/mcp-tools.test.js`                   | Node suites via `npm run test:dashboard` |

## CONVENTIONS

- A new `McpServer` is created per request; no cross-request protocol session state.
- Guard order is Host/Origin, POST-only, then `ADMIN_TOKEN` Bearer equality.
- Missing admin configuration returns 503; invalid authentication returns 401.
- Register tools through `registerApiTool`; use `READ_ONLY` or explicit `writeHints` annotations.
- Non-2xx operation responses and thrown errors become `isError` tool results.
- `createInternalApi` calls the router in-process; requests do not leave the Worker.
- Content tools query `content_files` directly and refuse bodies larger than 1 MiB.
- Text content uses UTF-8; binary or invalid UTF-8 content uses base64.
- Real submission needs an explicit candidate, `explicitSubmit`, `submitOptIn`, and matching `approvalId`.

## ANTI-PATTERNS

- Do not accept an admin cookie or HMAC session token as MCP Bearer authentication.
- Do not turn ordinary operation failures into JSON-RPC protocol failures.
- Do not treat tool annotations as authorization checks or invent approval identifiers.
- Do not add filesystem access to the D1 content tools.

Parent: [../AGENTS.md](../AGENTS.md)
