# Manual Deployment Guide

**Historical incident record**: 2025-11-11

> This page records an authentication and deployment incident reported on
> 2025-11-11. The reported Git transport and local Wrangler authentication
> blockers describe that date only; they are not current deployment status.

The report described failed GitHub SSH/HTTPS authentication and a local Wrangler
authentication failure. Its follow-up instructions used machine-local credentials
and direct deployment commands, so those procedures have been removed.

For current work, use the [deployment guide](../deployment-guide.md), the
[deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md), and the
[read-only GitHub validation workflow](../../.github/workflows/ci.yml). Cloudflare
Workers Builds owns production deployment.
