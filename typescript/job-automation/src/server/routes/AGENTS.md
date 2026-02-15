# SERVER ROUTES KNOWLEDGE BASE (apps/job-automation/src/server/routes)

> Parent: [../../AGENTS.md](../../AGENTS.md)

## OVERVIEW

Fastify route modules providing the REST API for the Unified Job Automation system. These routes bridge the modular backend services (shared/) with the frontend dashboard and external webhooks (n8n).

## STRUCTURE

- `index.js`: Central barrel for route module exports.
- `auth.js`: Google OAuth 2.0 and session management.
- `applications.js`: Job application CRUD and status tracking.
- `search.js`: Multi-platform job search orchestration.
- `ai.js`: AI-powered matching and system execution.
- `auto-apply.js`: Automated application task management.
- `stats.js` / `dashboard.js`: Aggregated metrics and UI support.
- `n8n.js`: Webhook handlers for n8n workflow integration.
- `profile.js`: Unified profile view across platforms.
- `config.js` / `d1.js` / `slack.js`: Component-specific endpoints.

## WHERE TO LOOK

| Base URL            | Route File           | Primary Responsibility           |
| :------------------ | :------------------- | :------------------------------- |
| `/api/auth`         | `auth.js`            | Login, Status, Logout            |
| `/api/search`       | `search.js`          | Job search via UnifiedCrawler    |
| `/api/applications` | `applications.js`    | Application history & management |
| `/api/ai`           | `ai.js`              | AI Match, Unified System trigger |
| `/api/auto-apply`   | `auto-apply.js`      | Playwright task orchestration    |
| `/api` (mixed)      | `stats.js`, `n8n.js` | Statistics, Webhooks             |

## CONVENTIONS

- **Module Pattern**: `export default async function nameRoutes(fastify) { ... }`
- **Dependency Access**: Access services via `fastify` decoration (e.g., `fastify.crawler`, `fastify.appManager`).
- **Input Handling**: Use `request.body` for POST/PUT and `request.query` for GET.
- **Error Propagation**: Throw errors directly; handled by `middleware/error-handler.js`.
- **Public vs Protected**: Define `{ config: { public: true } }` in route options for unauthenticated access.
- **RESTful naming**: Plural nouns for collections, descriptive verbs for actions (e.g., `/api/ai/match`).

## ANTI-PATTERNS

- **Direct Instantiation**: NEVER `new Service()` in routes. Use `fastify.decorate` services.
- **Hardcoded Logic**: Routes should be thin; move business logic to `shared/services/`.
- **Bypassing index.js**: Always export new route modules through the root `index.js`.
- **Missing Status Codes**: Explicitly set `reply.status()` for non-200 responses.
