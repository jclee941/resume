# MCP SERVER CORE (`typescript/job-automation/src/`)

> Parent: [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-01-30

## OVERVIEW

Node.js MCP server core implementing 9 tools (32 actions) for Wanted Korea automation. Handles job scraping, resume CRUD, AI matching, and multi-platform application orchestration.

## STRUCTURE

```
typescript/job-automation/src/
├── index.js              # MCP ENTRY: Tool/resource/prompt registration
├── server/               # UNIFIED FASTIFY SERVER (consolidated)
│   ├── index.js          # Server entry point
│   ├── plugins/
│   │   └── services.js   # Dependency injection for all services
│   └── routes/           # 13 modular route files
│       ├── dashboard.js  # /api/stats, /profile/unified
│       ├── applications.js
│       ├── ai.js
│       ├── n8n.js        # n8n webhook integration
│       └── ...
├── shared/               # PORTS-AND-ADAPTERS CORE
│   ├── clients/
│   │   └── wanted/       # WantedAPI (default + named exports)
│   └── services/
│       ├── apply/        # UnifiedApplySystem
│       ├── session/      # SessionManager
│       ├── matching/     # JobMatcher, AIMatcher
│       ├── slack/        # SlackService
│       ├── applications/ # ApplicationService
│       ├── stats/        # StatsService
│       └── auth/         # AuthService
├── lib/                  # UTILITIES (5 files only)
│   ├── secrets-client.js
│   ├── d1-client.js
│   ├── profile-aggregator.js
│   ├── mock-wanted-api.js
│   └── resume-optimizer.js
├── tools/                # MCP TOOLS (direct shared/ imports)
│   ├── resume.js         # 20 resume CRUD actions
│   ├── resume-sync.js    # 12 sync/pipeline actions
│   └── auth.js           # Session management
├── crawlers/             # SCRAPERS
│   ├── index.js          # Unified crawler entry
│   ├── wanted-crawler.js
│   ├── saramin-crawler.js
│   └── linkedin-crawler.js
└── auto-apply/           # AUTOMATION
    ├── index.js
    ├── auto-applier.js   # Playwright-based submission
    ├── cli.js            # CLI interface
    └── application-manager.js
```

## WHERE TO LOOK

| Task            | Location                    | Notes                                |
| --------------- | --------------------------- | ------------------------------------ |
| **Wanted API**  | `shared/clients/wanted/`    | SNS (profile) vs Chaos (resume) APIs |
| **AI Matching** | `shared/services/matching/` | JobMatcher + AIMatcher classes       |
| **Resume Sync** | `tools/resume-sync.js`      | Local JSON <-> Remote diff/merge     |
| **HTTP Server** | `server/index.js`           | Unified Fastify (was dashboard/)     |
| **Crawlers**    | `crawlers/`                 | Playwright + stealth patches         |

## CODE MAP

| Symbol               | Type    | Location                         | Role                                   |
| -------------------- | ------- | -------------------------------- | -------------------------------------- |
| `WantedAPI`          | Class   | `shared/clients/wanted/index.js` | HTTP client for Wanted SNS/Chaos APIs  |
| `SessionManager`     | Class   | `shared/services/session/`       | Cookie storage & rotation (singleton)  |
| `JobMatcher`         | Class   | `shared/services/matching/`      | Heuristic keyword scoring              |
| `AIMatcher`          | Class   | `shared/services/matching/`      | Claude-based resume/JD matching        |
| `UnifiedApplySystem` | Facade  | `shared/services/apply/`         | Multi-platform submission orchestrator |
| `SlackService`       | Service | `shared/services/slack/`         | Slack notifications                    |
| `ApplicationService` | Service | `shared/services/applications/`  | Application tracking (JSON store)      |

## CONVENTIONS

- **API Versioning**: Skills use v1 (`text` field), others use v2 (`name` field).
- **Session Path**: `~/.OpenCode/data/wanted-session.json`.
- **WAF Bypass**: Manual cookie extraction; automated login blocked by CloudFront.
- **Error Handling**: MUST catch API errors and return MCP-compliant error objects.
- **Direct Imports**: Import from `shared/` paths directly, NOT via lib/ wrappers.

## ANTI-PATTERNS

- **Hardcoded Resume IDs**: Use CLI `wanted_resume list_resumes` instead.
- **Direct Puppeteer**: ALWAYS use Playwright + stealth patches for Wanted.
- **Sync Secrets**: NEVER commit cookies/tokens; use SessionManager.
- **Links API Usage**: Broken (500 error); avoid until Wanted fixes.
- **lib/ Wrappers**: DELETED - all wrappers removed, import from shared/ directly.

## IMPORT EXAMPLES

```javascript
// CORRECT: Direct imports from shared/
import WantedAPI from "../shared/clients/wanted/index.js";
import { SessionManager } from "../shared/services/session/index.js";
import { JobMatcher } from "../shared/services/matching/index.js";
import { SlackService } from "../shared/services/slack/index.js";

// WRONG: Old lib/ wrapper imports (files deleted)
// import WantedAPI from '../lib/wanted-api.js';  // DELETED
// import { SessionManager } from '../lib/session-manager.js';  // DELETED
```

## COMMANDS

```bash
# Run MCP server
npm start

# Unified server (port 3000)
npm run server

# Resume sync
npm run sync -- [RESUME_ID]

# Tests
npm test
```

## NOTES

- **Server Consolidated**: `dashboard/server.js` monolith (3000+ LOC) → modular `server/routes/` (13 files)
- **Wanted API Quirks**: Skills v1 only, Links broken, Chaos requires resume_id in URL.
- **Session Sharing**: Cookies shared with Go CLI via JSON file exchange.
- **n8n Integration**: Webhooks via `server/routes/n8n.js`.
