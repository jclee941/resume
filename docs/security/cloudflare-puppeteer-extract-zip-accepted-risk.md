# Cloudflare Puppeteer extract-zip Advisories, Accepted Risk

**Status**: Accepted risk · unreachable installation path

**Date**: 2026-08-13 (updated 2026-09-26: added `GHSA-7pqw-9j4j-h8q3`, `@cloudflare/puppeteer@1.4.0`)

**Scope**: Cloudflare Browser Rendering dependency

The production dependency audit reports two `extract-zip` (<=2.0.1) advisories:
`GHSA-jmr9-qjv8-65gv` (unvalidated symlink path traversal) and
`GHSA-7pqw-9j4j-h8q3` (arbitrary file writes through symlink archive entries).
Both sit in the same archive-extraction code path. The repository accepts these
specific advisories while no compatible patched `@cloudflare/puppeteer` release
exists.

## Affected dependency path

```text
@cloudflare/puppeteer@1.4.0
└── @puppeteer/browsers@2.2.4
    └── extract-zip@2.0.1
```

The CI policy in `tools/scripts/verification/audit-production-dependencies.mjs`
allows only these advisories and this exact package graph. Any additional
high/critical advisory, malformed audit response, or graph change fails
`npm run security:audit`, which CI runs as the "Audit production dependencies"
step.

## Why the risk is accepted

1. `packages/shared/src/browser/browser-service.js` calls
   `puppeteer.launch(env.MYBROWSER)` against a Cloudflare Browser Rendering
   binding. It does not download, install, or extract a browser archive.
2. External web pages supplied to Browser Rendering are navigation input, not
   ZIP archives passed to `extract-zip`.
3. The production Worker dry-run bundle must exclude `extract-zip` and
   `@puppeteer/browsers`; inclusion invalidates this acceptance.
4. `@cloudflare/puppeteer@1.4.0` is the latest release (checked 2026-09-26) and
   still pins `@puppeteer/browsers@2.2.4`, the affected browser installer.

## Rejected alternatives

| Option | Why rejected |
| --- | --- |
| `npm audit --omit=optional` | Hides all optional production dependencies and future advisories. |
| `npm audit fix --force` | Downgrades `@cloudflare/puppeteer` to `0.0.11`, a breaking change. |
| Override `@puppeteer/browsers` to 3.x | Produces an invalid, unsupported dependency tree. |
| Disable or ignore audit failures | Would conceal unrelated production vulnerabilities. |

## Revisit trigger

Review monthly and whenever `@cloudflare/puppeteer` is updated. Remove the
exception as soon as a compatible release no longer depends on an affected
`extract-zip`. Re-run the full validation suite and the Wrangler production
dry-run before closing this record.
