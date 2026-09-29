# ADR 0010: Retire the local job-server runtime

**Status:** Accepted
**Date:** 2026-09-29
**Deciders:** Owner ("(C) job-server 로컬 자동화 전면 폐기")

## Context

Production automation is Cloudflare-native. The single `resume` Worker
(`apps/portfolio/entry.js` with the in-process `apps/job-dashboard/src` module,
ADR 0009) runs every scheduled job: Cron Triggers start Workflows, sessions live
in KV, state lives in D1, and Browser Rendering (`MYBROWSER`) replaces local
browsers.

`apps/job-server` (`@resume/job-automation`) remained as a second, local runtime:
an MCP server, a Fastify dashboard, Puppeteer/Playwright crawlers, local
auto-apply, a file session store (`sessions.json`), a session-broker container,
and local sync/session scripts. It was not registered in any agent config, no
Worker code imported it (ESLint forbids cross-app imports), and it duplicated
behavior the Worker already owns.

## Decision

Remove `apps/job-server` and everything that existed only to build, run, test, or
document it:

- the workspace entry, its root scripts (`test:node`, `test:coverage:node`,
  `sync:jobkorea*`, `op:seed:sessions`, `op:restore:sessions`, `docker:*`), the
  `c8` dev dependency, and the `qs` / `@hono/node-server` overrides
- the root `Dockerfile`, `.dockerignore`, `docker-compose.yml`, the
  session-broker compose and Dockerfile, and the Docker Dependabot entry
- `tools/scripts/onepassword/session-files`, the `verify:profile-sync` audit, the
  job-server targets in `tools/ci/affected`, and the job-server data sources of
  the skill enrichment tool
- `@resume/env/schemas/job-server` and the `@resume/shared` modules and export
  entries whose only consumer was the app (`phone`, `browser` barrel, JobKorea
  API client modules, `session/store`, `crypto/node`, `clients/wanted/endpoints/jobs`)
- MCP end-to-end specs, job-server integration and unit tests, and the guides
  that described the local runtime

## Consequences

- There is no local MCP server, no local crawlers, no local auto-apply, and no
  file-based session store. All automation runs in the Worker.
- JobKorea CAPTCHA renewal happens through the Worker routes
  `/job/api/jobkorea/refresh-session` or `/job/api/auth/set`.
- `npm test` and CI no longer run the job-server Node test suite.
- `sync:proposals` now only applies approved enrichment proposals
  (`tools/scripts/sync`); moving a pending proposal to `approved/` is a manual
  review step because the interactive review CLI lived in the app.
- Historical documents (ADRs, dated reviews and audits, `CHANGELOG.md`) keep
  their job-server references as history.
