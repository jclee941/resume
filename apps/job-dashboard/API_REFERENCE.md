# Job Dashboard API Reference

**Contract checked:** 2026-11-09

## Table of Contents

- [Overview](#overview)
- [Hosting and base URLs](#hosting-and-base-urls)
- [Authentication and request protection](#authentication-and-request-protection)
- [Endpoint groups](#endpoint-groups)
- [Local checks](#local-checks)
- [Sources](#sources)

## Overview

The dashboard API is served at `/job/*` by the portfolio Worker. Its REST contract,
including routes, request and response schemas, and status codes, is maintained in
[the canonical OpenAPI specification](../../packages/contracts/openapi.yaml). Use
that specification as the endpoint reference; this page summarizes where the API
runs and how its request protections work.

## Hosting and base URLs

| Use               | Base URL                      |
| ----------------- | ----------------------------- |
| Local development | `http://localhost:8787/job`   |
| Production route  | `https://resume.jclee.me/job` |

Start local development from the repository root with `npm run dev`. This runs the
merged Worker from the root `wrangler.jsonc`; the dashboard is imported
in-process, not deployed as a separate Worker.

For example, the health route is available at `/health` under either base URL:

```bash
curl http://localhost:8787/job/health
```

## Authentication and request protection

Administrative REST routes use a short-lived `adminToken` session cookie. The
`POST /api/auth/login` route exchanges the configured `ADMIN_TOKEN` for a
four-hour HMAC-signed session. Browser state-changing requests also use the CSRF
header and cookie defined in OpenAPI.

The documented legacy `Authorization: Bearer <ADMIN_TOKEN>` scheme remains
available for compatibility and is deprecated. The `/mcp` endpoint is separate:
it accepts an admin bearer token and does not use the browser cookie session.
Consult OpenAPI for the security requirements on each operation; authentication
and CSRF requirements vary by route.

## Endpoint groups

The OpenAPI document is the source for the current route list. It groups the
contract by health, applications, search, statistics, authentication,
auto-apply, workflows, and MCP operations. It also defines their request bodies,
responses, and security schemes. Check the operation itself before constructing
a client request; this page intentionally does not duplicate endpoint schemas.

## Local checks

Run these from the repository root:

```bash
npm run validate:openapi
npm run test:dashboard
```

The dashboard workspace does not own a separate Wrangler development or test
command. Root package scripts define workspace setup, local development, and
validation.

## Sources

- [Canonical REST contract](../../packages/contracts/openapi.yaml)
- [Dashboard request composition](src/index.js)
- [Root development and validation commands](../../package.json)
- [Dashboard README](./README.md)
- [Development guide](./DEVELOPMENT_GUIDE.md)
- [Architecture diagrams](./DIAGRAMS.md)
