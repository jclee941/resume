# JOB-SERVER CLIENTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Job-server-local D1, secret, and Wanted adapters. The Wanted subtree preserves
compatibility with the canonical `@resume/shared/clients/wanted` surface.

## CONVENTIONS

- Keep each client self-contained; clients expose domain-shaped results rather
  than transport internals.
- Inject HTTP/fetch, credentials, and endpoint configuration for testability.
- Keep cross-app reusable Wanted behavior in `@resume/shared`; local modules may
  adapt or re-export it for existing consumers.
- Translate transport failures into typed/structured errors at the adapter edge.
- Keep tests beside the adapter and mock network/session boundaries.

## ANTI-PATTERNS

- Never import one external client from another client.
- Never log credentials, cookies, tokens, secret values, or raw auth headers.
- Never add new implementation logic to a compatibility-only re-export.
- Never leak raw HTTP response details into services.

---

Parent: [../AGENTS.md](../AGENTS.md)
