# JOB AUTOMATION SRC KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

MCP server core with 9 tools (32 actions) for Wanted Korea job automation. Hexagonal architecture.

## STRUCTURE

```text
src/
├── index.js              # MCP Fastify bootstrap
├── cli.js                # job CLI entry
├── server/routes/        # 13 Fastify route modules
├── shared/               # hexagonal core (services + clients)
├── tools/                # 9 MCP tool definitions
├── crawlers/             # stealth Playwright crawlers
├── auto-apply/           # form fill + rate limiting
└── lib/                  # utility wrappers (DEPRECATED)
```

## CODE MAP

| Symbol               | Type     | Location                     | Role                       |
| -------------------- | -------- | ---------------------------- | -------------------------- |
| `main`               | function | `index.js`                   | Fastify + MCP registration |
| `WantedAPI`          | class    | `shared/clients/wanted/`     | 40+ methods, 6 files       |
| `BaseCrawler`        | class    | `crawlers/base-crawler.js`   | stealth, UA rotation       |
| `JobMatcher`         | class    | `shared/services/matching/`  | scoring + auto-apply gates |
| `SessionManager`     | class    | `shared/services/session/`   | 24h TTL cookies            |
| `AIMatcher`          | class    | `shared/services/matching/`  | AI-assisted scoring        |
| `UnifiedApplySystem` | class    | `auto-apply/auto-applier.js` | stealth form fill          |

## CONVENTIONS

- Skills v1 API only (v2 broken). Links API broken (500).
- Session file: `~/.OpenCode/data/wanted-session.json`.
- Import from `shared/` directly, not `lib/` wrappers.
- `lib/` directory is deprecated — do not add new files.

## ANTI-PATTERNS

- Never hardcode resume IDs.
- Never use naked Puppeteer — stealth plugins required.
- Never commit cookies or session files.
- Never import `lib/` wrappers — they are deleted/deprecated.
