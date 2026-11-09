# Quick Start

This guide uses the repository's current workspace and content-pack workflow.
Node.js 22 or newer and npm are required.

## Contents

- [Prepare the working tree](#prepare-the-working-tree)
- [Build and preview](#build-and-preview)
- [Run checks](#run-checks)
- [Make a content change](#make-a-content-change)
- [Production deployment](#production-deployment)

## Prepare the working tree

```bash
npm install
```

Portfolio and application content is owned by the D1 content pack and
materialized into the working tree. Read the
[Content Pack Guide](CONTENT_PACK.md) before editing it. A local build needs
the pack materialized; GitHub CI uses generated fixtures instead.

## Build and preview

```bash
npm run build
npm run dev
```

Open `http://localhost:8787`. The build runs content ensure, data sync, and
Worker generation. Edit source files only; generated Worker output is not an
authoring target.

## Run checks

```bash
npm test
```

The root test command runs the configured Node, Python, and Go suites.
Playwright browser tests are separate:

```bash
npm run test:e2e
```

See the [Testing Guide](TESTING_GUIDE.md) for test owners and focused commands.

## Make a content change

Use the source and materialization procedure in the
[Content Pack Guide](CONTENT_PACK.md); do not edit generated Worker bundles or
fixtures. Rebuild and preview the result locally before proposing a change.

## Production deployment

Production deployment is controlled by Cloudflare Workers Builds. A push to
the configured production branch triggers that external build and deployment;
it is a production-changing action. GitHub Actions validates changes but does
not deploy them. See the
[deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md). The manual
`npm run deploy` command is intentionally disabled.
