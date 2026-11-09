# Deployment Helper Reference

> **Current authority:** Production Worker builds are controlled by Cloudflare
> Workers Builds and the repository-root `wrangler.jsonc`. The scripts here are
> operator helpers, not the production deployment path. See the
> [repository deployment and build guidance](../../AGENTS.md) and the
> [current CI workflow](../../.github/workflows/ci.yml).

## Contents

- [Helper ownership](#helper-ownership)
- [Historical deployment record](#historical-deployment-record)

## Helper ownership

The source tree retains manual deployment and verification programs. Their
presence does not make them current production deployment instructions or
required CI gates. See the [deployment helper guide](deployment/AGENTS.md) and
[verification guide](verification/AGENTS.md) for their source-level scope.

The local Worker starts from the repository root with `npm run dev`; see the
[local Wrangler setup](dev/README.md). Root CI is a read-only validation
workflow. It does not run Playwright E2E or deploy the Worker.

## Historical deployment record

The [manual deployment incident guide](../../docs/guides/MANUAL_DEPLOYMENT_GUIDE.md)
is dated **2025-11-11** and records conditions reported on that date. Its
authentication and deployment status is historical; use current repository
deployment authority for present-day procedures.
