# CI/CD automation (historical guide)

> **Historical procedure.** The former multi-job CI, deployment workflow,
> coverage thresholds, and manual rollback instructions on this page do not
> describe the current repository pipeline.

GitHub Actions currently runs one read-only `validate` job from
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). It does not run
E2E tests or deploy the Worker. Production builds and deployments are owned by
Cloudflare Workers Builds using the [root Wrangler configuration](../../wrangler.jsonc).
See the [current deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md)
for the authoritative boundary and supported commands.

Use the scripts in the root [`package.json`](../../package.json) for local
checks. Do not use the retired `build:debug`, coverage, deploy, or rollback
commands described by the former procedure.
