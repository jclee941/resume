# Local Debugging Guide

This guide covers supported local development and test entry points. The current
[GitHub Actions workflow](../../.github/workflows/ci.yml) has one read-only
`validate` job; it does not use a local CI simulator, run E2E tests, or deploy.
Production deployment is owned by [Cloudflare Workers Builds](../architecture/DEPLOYMENT_PIPELINE.md).

## Contents

- [Start local development](#start-local-development)
- [Run tests](#run-tests)
- [Debug browser tests](#debug-browser-tests)
- [Use test mocks](#use-test-mocks)
- [Find current owners](#find-current-owners)

## Start local development

From the repository root:

```bash
npm run dev
```

This starts the configured local development environment. Check the startup output
for the local address and any required local content setup.

## Run tests

Run the repository test suite with:

```bash
npm test
```

The separate Playwright suite is available locally with:

```bash
npm run test:e2e
```

E2E tests are not part of the current GitHub validation workflow. For the current
command list, see the root [`package.json`](../../package.json).

## Debug browser tests

Use Playwright's supported CLI options with the E2E suite:

```bash
npx playwright test --debug
```

The command runs tests locally and may require the browser dependencies and
fixtures documented in [`tests/AGENTS.md`](../../tests/AGENTS.md).

## Use test mocks

Cloudflare binding mock ownership and migration notes are documented in
[`integration-test-mock-migration.md`](../architecture/integration-test-mock-migration.md).
Follow the test-specific fixture instructions there rather than assuming a mock
directory or persistent data path.

## Find current owners

- [CI workflow](../../.github/workflows/ci.yml): read-only validation.
- [Deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md): production build
  and deploy authority.
- [Package scripts](../../package.json): supported local commands.
- [Test guidance](../../tests/AGENTS.md): test suites and fixture selection.
