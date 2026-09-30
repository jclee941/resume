# PORTFOLIO WORKER KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Public Cloudflare Worker and the merged edge entry for the in-process dashboard.
`worker.js` and locale data snapshots are generated; `entry.js`, HTML, `src/`,
and `lib/` are editable sources.

The personal copy is content-pack data (ADR 0011), gitignored and materialized from D1:
`index.html`, `index-en.html`, `lib/hero-content-data.js`, `lib/skill-radar-data.js`,
`src/scripts/modules/*-data.js`, `manifest*.json`, `og-image*.{png,webp}`,
`assets/profile-photo.jpg`, `assets/resume*.pdf`, and `downloads/`. See
`docs/guides/CONTENT_PACK.md`.

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
└── assets/              # static binding: fonts, icons, copied resume PDFs and photo
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

- Run `npm run build` from the repository root; it ensures the content pack,
  synchronizes data, then generates the Worker. Without a pulled pack use
  `CONTENT_SOURCE=fixtures npm run build`.
- Preserve inline script bytes until CSP hashes are computed; do not trim or
  reorder the hash pipeline casually.
- Keep `/job/*`, queue, scheduled, Workflow, and Durable Object exports compatible
  with `apps/job-dashboard/src/index.js`.
- Inline text assets at build time and never inline large base64 images. Binary
  files live in `assets/`: the resume PDFs are served by the assets binding and
  `/assets/*` (fonts, icons, profile photo) goes through the Worker to `env.ASSETS`.
- `assets/profile-photo.jpg` is a byte copy of
  `packages/data/resumes/master/profile-photo.jpg`; a unit test enforces it.
- Keep locale intent aligned across source shells and canonical resume data.
- `sw.js` may cache static assets but must not cache nonce-bearing HTML.

## ANTI-PATTERNS

- Never edit `worker.js` or generated `data*.json` directly.
- Never commit content-pack files; edit them through `content:pull` → `content:push`.
- Never reintroduce a dashboard Service Binding unless ADR 0009 is reversed.
- Never hardcode design tokens outside `src/styles/variables.css`.
- Never add light-mode or animation behavior without updating design,
  reduced-motion, and accessibility contracts together.
- Never add runtime asset fetches outside the PDF and `/assets/*` routes.

## COMMANDS

```bash
npm run build
CONTENT_SOURCE=fixtures npm run build
npm run test:e2e:worker
npm run deploy:wrangler:root:dry-run
```

---

Parent: [../../AGENTS.md](../../AGENTS.md)
