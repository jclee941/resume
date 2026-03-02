# FASTIFY ROUTES KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

13 Fastify route modules for the MCP server HTTP API.

## ROUTE PATTERN

```javascript
export default async function nameRoutes(fastify) {
  fastify.get('/path', async (request, reply) => { ... });
}
```

## MODULES (13)

applications, auth, auto-apply, config, crawl, health, matching, profile, resume, search, stats, sync, webhooks.

## CONVENTIONS

- Services accessed via Fastify decoration, not direct instantiation.
- Public routes: `config.public = true`.
- Thin route handlers — business logic in `shared/services/`.
- All routes exported through `index.js` barrel.

## ANTI-PATTERNS

- Never instantiate services in route handlers.
- Never put business logic in routes — delegate to services.
- Never bypass authentication without `config.public = true`.
