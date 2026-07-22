# JOB AUTOMATION KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Node job-automation workspace with an MCP stdio server, optional Fastify HTTP
surface, platform automation, and operational scripts. Domain behavior follows
ports-and-adapters boundaries.

## STRUCTURE

```text
job-server/
├── src/index.js          # MCP stdio bootstrap
├── src/server/           # Fastify composition, plugins, and routes
├── src/handlers/         # MCP registration adapters
├── src/tools/            # MCP tool definitions
├── src/shared/           # services, repositories, clients, contracts
├── src/crawlers/         # unified crawler orchestration
├── src/auto-apply/       # browser submission pipeline
├── src/session-broker/   # Wanted session renewal boundary
├── scripts/              # auth, sync, pipeline, and operator adapters
└── platforms/            # platform-specific profile/crawler adapters
```

## WHERE TO LOOK

| Task                | Location                                                | Notes                           |
| ------------------- | ------------------------------------------------------- | ------------------------------- |
| MCP lifecycle       | `src/index.js`, `src/handlers/`                         | stdio transport and registry    |
| HTTP composition    | `src/server/index.js`, `src/server/plugins/services.js` | DI root                         |
| Domain behavior     | `src/shared/services/`                                  | child guides own service rules  |
| External adapters   | `src/shared/clients/`                                   | local and compatibility clients |
| Tool contracts      | `src/tools/`                                            | thin `execute()` adapters       |
| Platform operations | `src/crawlers/`, `platforms/`, `scripts/`               | stealth and session rules       |

## CONVENTIONS

- Compose dependencies in Fastify plugins or explicit constructors; route/tool
  adapters do not construct external clients.
- Keep flow direction: handlers/tools/routes → services → repositories → clients.
- Import canonical shared behavior from `src/shared/` or `@resume/shared/*`;
  compatibility re-exports are not new implementation homes.
- Use typed failures and structured logging; never log credentials or sessions.
- Keep browser automation platform-aware, rate-limited, and session-injected.

## ANTI-PATTERNS

- Never hardcode resume IDs, credentials, cookies, tokens, or account identifiers.
- Never add global/singleton state where constructor injection is available.
- Never call one external client from another client.
- Never place business logic in MCP tools, Fastify routes, or registration files.
- Never use aggressive polling, fixed user agents, or unguarded real submission.

## COMMANDS

```bash
npm test --workspace=@resume/job-automation
npm run server --workspace=@resume/job-automation
npm run auto-apply:dry --workspace=@resume/job-automation
```

---

Parent: [../../AGENTS.md](../../AGENTS.md)
