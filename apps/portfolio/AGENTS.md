# PORTFOLIO WORKER KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Public Cloudflare Worker and the merged edge entry for the in-process dashboard.
`worker.js` and locale data snapshots are generated; `entry.js`, HTML, `src/`,
and `lib/` are editable sources.

## STRUCTURE

```text
portfolio/
├── entry.js             # merged fetch/queue/scheduled router
├── generate-worker.js   # build entry; delegates to lib/build-orchestrator.js
├── worker.js            # generated bundle; never edit
├── index*.html          # localized source shells
├── data*.json           # generated snapshots from packages/data
├── lib/                 # build pipeline and Worker runtime modules
├── src/styles/          # design tokens and modular CSS
├── src/scripts/         # browser bootstrap and feature modules
├── sw.js                # asset service worker; never caches HTML
└── assets/              # static binding, including copied resume PDFs
```

## WHERE TO LOOK

| Task                    | Location                                          | Notes                                     |
| ----------------------- | ------------------------------------------------- | ----------------------------------------- |
| Merged edge routing     | `entry.js`                                        | sanctioned ADR 0009 dashboard import      |
| Worker generation       | `generate-worker.js`, `lib/build-orchestrator.js` | writes `worker.js`                        |
| Source markup           | `index.html`, `index-en.html`                     | metadata, landmarks, placeholders         |
| Build/runtime modules   | `lib/`                                            | child guide separates phases              |
| Browser behavior/styles | `src/`                                            | child guide owns accessibility and tokens |
| Design rules            | `DESIGN.md`                                       | current visual system                     |

## CONVENTIONS

- Run `npm run build` from the repository root; it synchronizes data before
  generating the Worker.
- Preserve inline script bytes until CSP hashes are computed; do not trim or
  reorder the hash pipeline casually.
- Keep `/job/*`, queue, scheduled, Workflow, and Durable Object exports compatible
  with `apps/job-dashboard/src/index.js`.
- Inline normal assets at build time. Only `/resume.pdf` and `/resume-full.pdf`
  use `env.ASSETS` at runtime.
- Keep locale intent aligned across source shells and canonical resume data.
- `sw.js` may cache static assets but must not cache nonce-bearing HTML.

## ANTI-PATTERNS

- Never edit `worker.js` or generated `data*.json` directly.
- Never reintroduce a dashboard Service Binding unless ADR 0009 is reversed.
- Never hardcode design tokens outside `src/styles/variables.css`.
- Never add light-mode or animation behavior without updating design,
  reduced-motion, and accessibility contracts together.
- Never add runtime asset fetches outside the documented PDF exception.

## COMMANDS

```bash
npm run build
npm run test:e2e:worker
npm run deploy:wrangler:root:dry-run
```

---

Parent: [../../AGENTS.md](../../AGENTS.md)
