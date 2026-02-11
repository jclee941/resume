# Project Structure & File Purpose Guide

## 1. Core Architecture (Ports-and-Adapters)

### Shared Domain Services (`src/shared/services/`)

Core business logic, decoupled from HTTP/CLI adapters.

| Service      | Path        | Purpose                    | Key Files                         |
| :----------- | :---------- | :------------------------- | :-------------------------------- |
| **Session**  | `session/`  | Authentication persistence | `session-manager.js`              |
| **Matching** | `matching/` | Job/Resume matching engine | `job-matcher.js`, `ai-matcher.js` |
| **Apply**    | `apply/`    | Orchestration facade       | `unified-apply-system.js`         |
| **Auth**     | `auth/`     | Identity management        | `auth-service.js`                 |
| **Stats**    | `stats/`    | Analytics aggregation      | `stats-service.js`                |
| **Slack**    | `slack/`    | Notification integration   | `slack-service.js`                |

### External Clients (`src/shared/clients/`)

Wrappers for external APIs.

| Client     | Path      | Purpose                      |
| :--------- | :-------- | :--------------------------- |
| **Wanted** | `wanted/` | Wanted Korea API (SNS/Chaos) |

## 2. Adapters (Interfaces)

### HTTP Server (`src/server/`)

Fastify-based REST API for Dashboard & Webhooks.

| Route         | File                  | Purpose                  |
| :------------ | :-------------------- | :----------------------- |
| **Dashboard** | `routes/dashboard.js` | Frontend stats & config  |
| **Profile**   | `routes/profile.js`   | User profile aggregation |
| **AI**        | `routes/ai.js`        | LLM-based operations     |
| **Webhooks**  | `routes/n8n.js`       | n8n automation triggers  |

### CLI (`src/auto-apply/cli/index.js`)

Command-line interface for automation pipelines.

### MCP Tools (`src/tools/`)

AI Agent interfaces for Model Context Protocol.

| Tool       | File             | Actions                |
| :--------- | :--------------- | :--------------------- |
| **Resume** | `resume.js`      | CRUD operations        |
| **Sync**   | `resume-sync.js` | Pipeline orchestration |
| **Auth**   | `auth.js`        | Session control        |

## 3. Infrastructure & Utilities (`src/lib/`)

Low-level infrastructure code (to be migrated).

| Component    | File                  | Purpose                       |
| :----------- | :-------------------- | :---------------------------- |
| **Database** | `d1-client.js`        | Cloudflare D1 query wrapper   |
| **Secrets**  | `secrets-client.js`   | Infisical/Env secrets manager |
| **AI Opt**   | `resume-optimizer.js` | Resume tailoring logic        |

## 4. Automation Engines

### Crawlers (`src/crawlers/`)

Playwright-based scraping engines.

| Crawler      | File                  | Target                 |
| :----------- | :-------------------- | :--------------------- |
| **Unified**  | `index.js`            | Factory & Orchestrator |
| **Wanted**   | `wanted-crawler.js`   | Wanted Korea           |
| **Saramin**  | `saramin-crawler.js`  | Saramin                |
| **LinkedIn** | `linkedin-crawler.js` | LinkedIn Easy Apply    |

### Auto-Apply (`src/auto-apply/`)

Submission automation logic.

| Component   | File                     | Purpose                   |
| :---------- | :----------------------- | :------------------------ |
| **Applier** | `auto-applier.js`        | Browser interaction logic |
| **Manager** | `application-manager.js` | State tracking            |

## 5. Go Operations CLI (`cmd/resume-cli/`)

DevOps & Orchestration tool.

| Command Group | Files                  | Purpose               |
| :------------ | :--------------------- | :-------------------- |
| **Wanted**    | `commands/wanted_*.go` | Wanted API wrapper    |
| **Core**      | `commands/root.go`     | Entry point           |
| **Deploy**    | `commands/deploy.go`   | Deployment automation |
| **Verify**    | `commands/verify.go`   | Health checks         |
