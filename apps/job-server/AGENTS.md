# JOB AUTOMATION KNOWLEDGE BASE

**Generated:** 2026-04-14
**Commit:** `c2629c9`
**Branch:** `master`

## OVERVIEW

MCP Server + Cloudflare Worker for stealth job automation on Korean job platforms. Hexagonal architecture with shared services/clients core.

## STRUCTURE

```text
job-server/
├── src/                    # MCP server core
│   ├── index.js            # Fastify MCP bootstrap
│   ├── cli.js              # job CLI entry
│   ├── server/routes/      # 13 Fastify route modules
│   ├── shared/             # hexagonal core (services + clients)
│   ├── handlers/           # MCP handler registration
│   ├── session-broker/     # Wanted session renewal broker
│   ├── test-helpers/       # test mock infrastructure
│   ├── tools/              # 16 MCP tools
│   ├── crawlers/           # stealth Playwright crawlers
│   ├── auto-apply/         # form fill + rate limiting
│   └── lib/                # utility wrappers (deprecated)
├── scripts/                # auth/sync utilities (see scripts/AGENTS.md)
├── platforms/              # 10 platform-specific crawlers (see platforms/AGENTS.md)
├── config.json             # runtime config
├── openapi.yaml            # API spec
└── docker-compose.yml      # local dev stack
```

## WHERE TO LOOK

| Task                 | Location               | Notes                              |
| -------------------- | ---------------------- | ---------------------------------- |
| MCP server bootstrap | `src/index.js`         | Fastify + MCP tool registration    |
| MCP tool definitions | `src/tools/`           | 16 MCP tools                       |
| API routes           | `src/server/routes/`   | 13 class-based Fastify modules     |
| Domain services      | `src/shared/services/` | 18 service directories             |
| API clients          | `src/shared/clients/`  | wanted, d1, elasticsearch, secrets |
| Stealth crawlers     | `src/crawlers/`        | BaseCrawler + platform subclasses  |
| Auto-apply           | `src/auto-apply/`      | Playwright form fill               |
| Auth scripts         | `scripts/`             | quick-login, cookie extraction     |

## CODE MAP

| Symbol               | Type     | Location                            | Role                             |
| -------------------- | -------- | ----------------------------------- | -------------------------------- |
| `main`               | function | `src/index.js`                      | MCP Fastify bootstrap            |
| `WantedAPI`          | class    | `src/shared/clients/wanted/`        | 40+ methods across 6 files       |
| `BaseCrawler`        | class    | `src/crawlers/base-crawler.js`      | UA rotation, stealth, 1s+ jitter |
| `JobMatcher`         | class    | `src/shared/services/matching/`     | <60 skip, 60-74 review, ≥75 auto |
| `SessionManager`     | class    | `src/shared/services/session/`      | 24h TTL, cookie persistence      |
| `UnifiedApplySystem` | class    | `src/auto-apply/auto-applier.js`    | stealth form submission          |
| `ApplicationService` | class    | `src/shared/services/applications/` | CRUD + analytics                 |

## CONVENTIONS

- Hexagonal arch: services (domain logic) ↔ clients (external adapters).
- DI via constructor injection; no global state in services.
- MCP tool export: `export const {name}Tool = { ... }`.
- Fastify route: `export default async function nameRoutes(fastify)`.
- Skills v1 API only (v2 broken). Links API broken (500).
- Session at `~/.OpenCode/data/wanted-session.json`.
- Import from `shared/` directly, not `lib/` wrappers (deprecated).

## ANTI-PATTERNS (THIS PROJECT)

- Never use naked Puppeteer — always stealth plugins + UA rotation.
- Never aggressive polling (1s+ jitter, 3 retries max).
- Never fixed UA strings — rotate from pool.
- Never cross-client imports (d1 ↛ wanted ↛ secrets).
- Never hardcode resume IDs or credentials.
- Never commit cookies or session files.
- Never direct state in services — inject via constructor.
- Never use Skills v2 API or Links API (broken).
- Never instantiate services in routes — use Fastify decoration.

## PLATFORM STATUS

| Platform    | Method             | Detection Risk | Status  |
| ----------- | ------------------ | -------------- | ------- |
| Wanted      | API + stealth      | Medium (WAF)   | Active  |
| JobKorea    | Cheerio/Playwright | Low            | Active  |
| Saramin     | Playwright+stealth | Medium         | Active  |
| LinkedIn    | fetch + regex      | High           | Fragile |
| Remember    | Mobile API         | Low            | Planned |
| Jumpit      | Playwright         | Low            | Active  |
| Programmers | Playwright         | Low            | Active  |
| Rallit      | Playwright         | Low            | Active  |
| RocketPunch | Playwright         | Low            | Active  |
| Indeed      | Playwright         | Medium         | Active  |

## WORKER BINDINGS

- D1: `job-dashboard-db` (applications, job_cache, sync_logs)
- KV: `SESSIONS`, `RATE_LIMIT_KV`
- Queue: `crawl-tasks`
- 7 Workflows: job-crawling, application, resume-sync, daily-report, health-check, backup, cleanup

## NOTES

- See child AGENTS.md for domain-specific details (src/, scripts/, platforms/).
- session-broker provides Wanted session renewal via Docker (stealth browser + Node.js broker on port 3456).
- Large files: notifications.js (1043L), application.js (851L), resume.js (869 lines), profile-sync.js (966), auth-sync.js (846).
