# JOB SERVER HTTP SERVER KNOWLEDGE BASE

**Generated:** 2026-06-10
**Commit:** `b74e95d1`
**Branch:** `master`

## OVERVIEW

Fastify HTTP server for job automation APIs, dashboard support, plugins, and
automation webhook integration. This is separate from the MCP stdio entry at
`src/index.js`.

## STRUCTURE

```text
server/
├── index.js              # Fastify app assembly and route registration
├── config/               # env-backed server config
├── middleware/           # error handling
├── plugins/              # auth, metrics, services, swagger, automation webhook
├── routes/               # HTTP route modules (see routes/AGENTS.md)
└── __tests__/            # server and webhook tests
```

## CONVENTIONS

- Register shared services through Fastify plugins/decorations before routes.
- Keep `index.js` as assembly code: plugins, middleware, routes, startup.
- Route modules consume decorated services; they do not construct clients.
- Public route access must be explicit in route config or auth plugin policy.

## ANTI-PATTERNS

- Do not import dashboard Worker handlers into this Fastify server.
- Do not instantiate `D1Client`, crawlers, or application services in routes.
- Do not add business logic to plugins that should live in `shared/services/`.
- Do not log auth tokens, cookies, webhook secrets, or raw request credentials.

---

Parent: [../AGENTS.md](../AGENTS.md)
