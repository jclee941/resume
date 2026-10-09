# PORTFOLIO WORKER KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Public edge routing, Worker generation, and static-asset ownership for the portfolio.

Scope reason: score 10; required public application boundary.

## WHERE TO LOOK

| Task                    | Location                                  | Notes                                                  |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------ |
| Edge routing            | `entry.js`                                | Dashboard forwarding and portfolio response adaptation |
| Generator entry         | `generate-worker.js`                      | Calls `lib/build-orchestrator.js`                      |
| Bundle type surface     | `worker.d.ts`                             | Declares generated Worker exports for strict checking  |
| Build/runtime internals | `lib/AGENTS.md`                           | Phase boundaries and emitted source                    |
| Browser source          | `src/AGENTS.md`                           | CSS cascade and feature modules                        |
| Static assets           | `assets/`, `assets/_headers`              | Fonts, icons, PDF headers                              |
| Offline caching         | `sw.js`                                   | Static precache and runtime caches                     |
| Design                  | `DESIGN.md`                               | Portfolio-specific visual rules                        |
| Auxiliary generation    | `generate-og-image.js`, `validate-seo.go` | Image generation and SEO validation                    |

## CONVENTIONS

- Keep dashboard queue, scheduled, Workflow, and Durable Object forwarding compatible with its entry.
- `worker.d.ts` must match the generated bundle exports without requiring a build for typechecking.
- Text assets are inlined at build time; large binary assets use the static binding.
- Resume PDFs and `/assets/*` are the runtime `env.ASSETS` fetch routes.
- The published profile photo is copied byte-for-byte from the canonical photo source.
- `sw.js` caches static assets, never response-nonce-bearing HTML.
- Source shells, locale snapshots, manifests, downloads, and private assets are materialized inputs or generated outputs; consult the content manifest for exact ownership.
- `entry.js` is ESM; build scripts use CommonJS, and browser scripts have their own ESM marker.

## ANTI-PATTERNS

- Do not restore a dashboard Service Binding beside the in-process route.
- Do not introduce runtime asset fetching for ordinary HTML/CSS/JS content.
- Do not put large base64 images into the inline text pipeline.
- Do not assume the presence of a local content file makes it tracked source.

Parent: [../../AGENTS.md](../../AGENTS.md)
