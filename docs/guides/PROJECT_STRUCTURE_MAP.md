# Project Structure & File Purpose Guide

## 1. Runtime

One Cloudflare Worker serves everything. `apps/portfolio/entry.js` routes the
public portfolio and forwards `/job/*` to the in-process dashboard module in
`apps/job-dashboard/src/index.js` (ADR 0009).

| Area               | Path                                         | Purpose                                      |
| :----------------- | :------------------------------------------- | :------------------------------------------- |
| **Portfolio**      | `apps/portfolio/`                            | Worker entry, HTML, `lib/`, generated bundle |
| **Dashboard**      | `apps/job-dashboard/src/`                    | Handlers, routes, workflows, queues, views   |
| **Scheduled runs** | `apps/job-dashboard/src/handlers/scheduled/` | Cron Trigger dispatch into Workflows         |

## 2. Dashboard Layers

Handlers call services, services call repositories and clients.

| Layer         | Path                                | Purpose                              |
| :------------ | :---------------------------------- | :----------------------------------- |
| **Routes**    | `apps/job-dashboard/src/routes/`    | Route registration                   |
| **Handlers**  | `apps/job-dashboard/src/handlers/`  | Request handlers, auto-apply control |
| **Workflows** | `apps/job-dashboard/src/workflows/` | Cloudflare Workflow classes          |
| **Services**  | `apps/job-dashboard/src/services/`  | Platform clients, notifications      |
| **Queues**    | `apps/job-dashboard/src/queues/`    | Queue message to Workflow dispatch   |

## 3. Shared Packages

| Package     | Path                | Purpose                                   |
| :---------- | :------------------ | :---------------------------------------- |
| **shared**  | `packages/shared/`  | Errors, logger, retry, crypto, rate-limit |
| **types**   | `packages/types/`   | Canonical JSDoc/TS domain types           |
| **schemas** | `packages/schemas/` | Zod runtime schemas                       |
| **env**     | `packages/env/`     | Environment validation                    |
| **data**    | `packages/data/`    | Resume SSoT and proposals                 |

## 4. Resume CLI (`packages/cli/`)

Workspace CLI package for resume operations.

| Component     | File           | Purpose               |
| :------------ | :------------- | :-------------------- |
| **CLI Entry** | `src/index.js` | CLI commands          |
| **Build**     | `src/build.js` | Resume build pipeline |
