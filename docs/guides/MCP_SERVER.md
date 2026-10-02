# job-mcp-server (remote MCP)

The dashboard Worker serves a Model Context Protocol server at
`https://resume.jclee.me/job/mcp` (source: `apps/job-dashboard/src/mcp/`). It exposes the
job automation as MCP tools and is authenticated with the admin Bearer token.

## Transport and security

- Streamable HTTP, stateless: one JSON-RPC request per `POST`, no sessions, no
  `Mcp-Session-Id`. Both protocol eras are served: the 2026-07-28 per-request envelope and
  the 2025 `initialize` handshake (answered as `text/event-stream`).
- Request order in `src/index.js`: rate limit (`api` policy class) -> Host/Origin check
  (a browser Origin other than the site origin is 403) -> method check (`GET`, `DELETE`
  and `OPTIONS` are 405) -> admin Bearer (`401` with `WWW-Authenticate: Bearer`) -> MCP handler.
- Only `Authorization: Bearer <ADMIN_TOKEN>` authenticates. An admin session token sent as
  Bearer is `401`, and the admin session cookie is ignored, so the CSRF double-submit does not apply to `/mcp` (the same kind of exemption
  as the HMAC-signed webhooks). No CORS headers are sent.
- Tools call the dashboard's own route table with an internal request, so each tool runs
  the same handler and safety gates as its REST endpoint. Nothing is re-implemented in the
  MCP layer; the only direct SQL is the read-only `content_files` queries.

## Tools

Read tools carry `readOnlyHint: true`.

| Tool                        | Purpose                                                                     |
| --------------------------- | --------------------------------------------------------------------------- |
| `get_status`                | Worker status, version, application count                                   |
| `list_applications`         | `status`, `platform`, `limit` (default 50), `offset`                        |
| `get_application`           | One application with its timeline (`id`)                                    |
| `get_stats`                 | Overall and weekly statistics                                               |
| `get_report`                | `period`: `daily` (optional `date`) or `weekly`                             |
| `get_auto_apply_status`     | Enablement, daily budget, platforms, pending approvals                      |
| `get_auto_apply_config`     | Stored auto-apply configuration (never writes)                              |
| `get_workflow_instance`     | `workflowType` + `instanceId` status and output                             |
| `list_profile_sync_history` | Recent profile sync runs (`limit`)                                          |
| `get_master_resume`         | `mode`: `summary` (default; section names and counts only) or `full`        |
| `list_content_files`        | D1 `content_files` under an optional `prefix`                               |
| `get_content_file`          | One content file: utf-8 text, or base64 for binaries; over 1 MiB is refused |

Write tools change state. `destructiveHint: true` marks external side effects or an
authorization, so clients ask before running them.

| Tool                        | Behavior                                                                                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run_auto_apply`            | `POST /api/auto-apply/run`. `dryRun` defaults to **true**. A real submit needs exactly one explicit candidate, `explicitSubmit`, `submitOptIn` and a matching `approvalId`; the existing gate rejects anything else. |
| `approve_application`       | Approve the pending approval requests of an application workflow (`instanceId`)                                                                                                                                      |
| `reject_application`        | Reject them                                                                                                                                                                                                          |
| `update_application_status` | `id`, `status`, optional `note`; validated by the status enum                                                                                                                                                        |
| `start_resume_sync`         | Start the resume sync workflow; `dryRun` defaults to **true**                                                                                                                                                        |
| `start_job_crawl`           | Start the job crawling workflow; `dryRun` defaults to **true**                                                                                                                                                       |
| `sync_application_history`  | `POST /api/applications/sync`; optional `platforms` (`wanted`, `jobkorea`, `remember`). Pulls the real application history into D1 by (source, job_id), never deletes, returns counts and per-platform errors only   |
| `refresh_platform_session`  | `platform`: `wanted` or `jobkorea`                                                                                                                                                                                   |

Every result carries `structuredContent` plus the same JSON as a text block. Failures
(validation, handler errors, a missing `content_files` table) come back as `isError`
results; an unknown tool is a JSON-RPC `-32602` error.

## Token

Never commit the token. Read it from 1Password into the shell that launches the client:

```bash
export JOB_ADMIN_TOKEN="$(op read op://homelab/resume/ADMIN_TOKEN)"
```

## Client configuration

Claude Code:

```bash
claude mcp add --transport http job-mcp-server https://resume.jclee.me/job/mcp \
  --header "Authorization: Bearer $JOB_ADMIN_TOKEN"
```

OpenCode (`opencode.json`; `oauth: false` stops it probing for OAuth):

```json
{
  "mcp": {
    "job-mcp-server": {
      "type": "remote",
      "url": "https://resume.jclee.me/job/mcp",
      "enabled": true,
      "oauth": false,
      "headers": { "Authorization": "Bearer {env:JOB_ADMIN_TOKEN}" }
    }
  }
}
```

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.job-mcp-server]
url = "https://resume.jclee.me/job/mcp"
bearer_token_env_var = "JOB_ADMIN_TOKEN"
```

## Local check

```bash
printf 'ADMIN_TOKEN=local-test-token\n' > .dev.vars   # throwaway; never commit, delete afterwards
npm run dev                                          # http://localhost:8787/job/mcp
```

Point a client at `http://localhost:8787/job/mcp` with `Authorization: Bearer local-test-token`.

## Tests

`npm run test:dashboard` runs `apps/job-dashboard/src/mcp/__tests__/` against the real handler
and router with a stubbed D1 and Workflow bindings; `tests/unit/job-dashboard/mcp-route.test.js`
covers the `index.js` pipeline (rate limit, CSRF exemption, no CORS).
