# PORTFOLIO WORKER KNOWLEDGE BASE

**Generated:** 2026-06-28
**Commit:** `4bd11dd2`
**Branch:** `master`

## OVERVIEW

Cloudflare Worker serving the public portfolio and the in-process `/job/*`
dashboard API. `worker.js` is generated; `entry.js` is the hand-authored merged
edge router.

## STRUCTURE

```text
portfolio/
├── index.html              # source HTML (hand-edited)
├── index-en.html           # English portfolio source
├── generate-worker.js      # build compiler
├── worker.js               # GENERATED — never edit
├── entry.js                # merged edge router; imports job-dashboard in-process
├── data.json               # Generated resume snapshot (KO), built from packages/data SSoT
├── data_en.json            # English resume data
├── data_ja.json            # Japanese resume data
├── dashboard.html          # admin dashboard (1290 lines)
├── lib/                    # 25 build/runtime modules (see lib/AGENTS.md)
├── src/                    # source styles/scripts (see src/AGENTS.md)
├── assets/                 # static files (fonts, favicons)
├── generate-og-image.js    # OG image generator
├── og-image.png/webp       # Generated OG image (KO)
├── og-image-en.png/webp    # Generated OG image (EN)
├── generate-project-schemas.js # Schema generator
├── sitemap.xml             # SEO sitemap
├── robots.txt              # SEO robots config
├── wrangler.jsonc          # worker config (name: resume)
└── validate-seo.go         # SEO validation script
```

## WHERE TO LOOK

| Task            | Location                      | Notes                                                      |
| --------------- | ----------------------------- | ---------------------------------------------------------- |
| Build pipeline  | `generate-worker.js`          | HTML→CSP→inline→worker.js                                  |
| Source markup   | `index.html`, `index-en.html` | KO/EN portfolio templates                                  |
| Runtime modules | `lib/`                        | 25 stateless JS modules                                    |
| Multi-language  | `i18n.js`, `data_*.json`      | KO/EN/JA support                                           |
| OG Image Gen    | `generate-og-image.js`        | Canvas-based social image generation                       |
| Project Schemas | `*project-schemas.js`         | JSON-LD generation and injection                           |
| SEO/Metadata    | `SEO_IMPLEMENTATION.md`       | sitemap, robots, meta tags                                 |
| Edge routing    | `entry.js`                    | routes `/job/*` into job-dashboard without Service Binding |

## BUILD PIPELINE

```text
resume_data.json → sync → data.json
index.html → generate-worker.js → worker.js → entry.js → Workers Builds
                 ↓
         escape backticks
         compute CSP hashes
         inline CSS + data
```

## CONVENTIONS

- Inline assets at build time; the sole exception is `resume.pdf` (served via `env.ASSETS`).
- CSS vars for theming (see `src/styles/variables.css`).
- Pure functions in `lib/` — receive env, no side effects.
- Fire-and-forget telemetry (ES logger, metrics).
- Multi-language: `data.json` (ko), `data_en.json`, `data_ja.json`.
- `entry.js` is the sanctioned ADR 0009 cross-app import point for
  `../job-dashboard/src/index.js`.

## ANTI-PATTERNS

- Never edit `worker.js` directly — it is generated.
- Never `trim()` inline scripts before CSP hash generation.
- Never add runtime fetch for assets — inline at build (EXCEPTION: `/resume.pdf` reads `env.ASSETS`).
- Never hardcode colors — use CSS variables.
- Never add light-mode without updating root docs.
- Never reintroduce a Service Binding for `/job/*` unless ADR 0009 is reversed.

## CONTENT UPDATE PATTERN

Hardcoded content in `index.html`/`index-en.html` must match SSoT
(`resume_data.json`):

- Title/meta/OG/Twitter tags: `Security Automation / Infrastructure Engineer` across KO/EN/JA, with localized name prefixes where needed
- JSON-LD Person schema: `knowsAbout` (12 domains), `jobTitle`, `description`
- About section: career highlights (quantified achievements), current focus
- Hero name, role line, and positioning sentence; section copy
- After edits: `npm run sync:data && npm run build` to regenerate `worker.js`

## EXCEPTIONS

- `/resume.pdf` is served from the static `assets` binding (`assets/resume.pdf`).
  The build copies the SSoT PDF into `assets/` and the worker route in
  `lib/worker-routes/seo-routes.js` reads it via `env.ASSETS.fetch()` (with a
  404 fallback) instead of inlining ~210KB of base64. This is the ONLY runtime
  asset fetch; everything else stays inlined at build.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
