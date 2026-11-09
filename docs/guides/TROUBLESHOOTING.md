# Troubleshooting Guide

This guide covers the current local build, test, content, and deployment
boundaries. Historical incident details are not reproduced as current
procedures.

## Contents

1. [Build cannot find content](#build-cannot-find-content)
2. [Build or tests fail](#build-or-tests-fail)
3. [Browser tests fail](#browser-tests-fail)
4. [Portfolio changes are not live](#portfolio-changes-are-not-live)
5. [Where to check next](#where-to-check-next)

## Build cannot find content

Local builds require the D1-owned content pack to be materialized. Follow the
[Content Pack Guide](CONTENT_PACK.md) to understand `content:pull`, local
development, and the fixture source used in GitHub CI. Never edit generated
fixtures by hand.

```bash
npm run content:status
```

Review the status and the content guide before pulling or replacing local
content. `npm run build` also runs the repository's content ensure step.

## Build or tests fail

Run the documented root commands from the repository root:

```bash
npm run build
npm test
```

`npm run build` runs content ensure, data sync, and Worker generation.
`npm test` runs the configured Jest, workspace, Python, and Go suites. See the
[Testing Guide](TESTING_GUIDE.md) for focused test commands and runner owners.

## Browser tests fail

Playwright E2E tests run separately from `npm test` and start the local Worker
unless explicitly configured otherwise:

```bash
npm run test:e2e
```

For visual baselines and their local, ignored ownership, see the
[Visual Regression Testing Guide](VISUAL_REGRESSION_TESTING.md).

## Portfolio changes are not live

Confirm that the source change was built and that the production deployment
was triggered through Cloudflare Workers Builds. GitHub Actions validates
changes; it does not deploy them. A push to the configured production branch
is a production-changing action. See the
[deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md).

## Where to check next

- [Content ownership and materialization](CONTENT_PACK.md)
- [PDF generator commands and outputs](PDF_GENERATION.md)
- [Current monitoring configuration](../../infrastructure/monitoring/README.md)
- [Root npm scripts](../../package.json)
