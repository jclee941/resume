# PORTFOLIO WORKER KNOWLEDGE BASE

**Generated:** 2026-06-28
**Commit:** `4bd11dd2`
**Branch:** `master`

## OVERVIEW

Cloudflare Worker serving the public portfolio and the in-process `/job/*`
dashboard API. `worker.js` is generated; `entry.js` is the hand-authored merged
edge router.

## STRUCTURE

### Hand-authored entries and templates

- `index.html` and `index-en.html`: KO and EN source templates.
- `entry.js`: merged edge router and the sanctioned job-dashboard import.
- `generate-worker.js`: build compiler.
- `lib/`: build and runtime modules; see `lib/AGENTS.md`.
- `src/`: source styles and scripts; see `src/AGENTS.md`.
- `dashboard.html`: admin dashboard source.

### Generated portfolio artifacts

- `worker.js`: generated Worker bundle; never edit.
- `data.json`, `data_en.json`, and `data_ja.json`: generated locale snapshots.
- `og-image.png`, `og-image-en.png`, and locale WebP counterparts: generated
  share artwork.

### Configuration and generators

- `generate-og-image.js`: OG image generator.
- `generate-project-schemas.js`: JSON-LD schema generator.
- `sitemap.xml`, `robots.txt`, and `wrangler.jsonc`: public routing and Worker
  configuration.
- `validate-seo.go`: SEO validator.
- `assets/`: static files, including the generated resume copy.

## WHERE TO LOOK

- Build pipeline: `generate-worker.js` compiles HTML, CSP, inline assets, and
  `worker.js`.
- Source markup: `index.html` and `index-en.html` own KO/EN templates.
- Runtime modules: `lib/` contains the stateless build/runtime modules.
- Multi-language: `i18n.js` consumes generated `data_*.json` snapshots.
- OG images: `generate-og-image.js` owns Canvas-based generation.
- Project schemas: `*project-schemas.js` files own JSON-LD generation.
- SEO and metadata: templates, router helpers, sitemap, and live source override
  historical `SEO_IMPLEMENTATION.md` guidance.
- Edge routing: `entry.js` routes `/job/*` without a Service Binding.

## BUILD PIPELINE

### Web data and Worker

1. Canonical locale JSON lives under `packages/data/resumes/master/`.
2. `npm run sync:data` creates `apps/portfolio/data*.json`.
3. `generate-worker.js` creates `worker.js`.
4. `entry.js` merges the generated Worker with edge routing.
5. Cloudflare Workers Builds owns normal production deployment.

### Public PDF

1. `packages/data/resumes/master/resume_master.md` is the Markdown source.
2. `tools/scripts/build/pdf-generator.go master` creates
   `packages/data/resumes/master/resume_final.pdf`.
3. The portfolio build copies it to `apps/portfolio/assets/resume.pdf`.

### OG artwork

`apps/portfolio/generate-og-image.js` creates the generated locale PNG/WebP
assets.

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
- Never hand-edit generated `apps/portfolio/data*.json`, PDF, or OG image
  artifacts; update their named source owner and run its generator.
- Never `trim()` inline scripts before CSP hash generation.
- Never add runtime fetch for assets — inline at build (EXCEPTION: `/resume.pdf` reads `env.ASSETS`).
- Never hardcode colors — use CSS variables.
- Never add light-mode without updating root docs.
- Never reintroduce a Service Binding for `/job/*` unless ADR 0009 is reversed.

## CONTENT UPDATE PATTERN

The public identity contract is primary `Full-Stack Engineer` with supporting
`Security Automation & Edge Infrastructure`, localized exactly through
[`DESIGN.md`](./DESIGN.md) and the
[visual masterplan](../../docs/architecture/portfolio-visual-masterplan.md).

Source ownership is explicit:

- `packages/data/resumes/master/resume_data.json` owns canonical resume and
  project facts. `resume_data_en.json` and `resume_data_ja.json` own aligned
  locale translations. Run `npm run sync:data`; never edit generated
  `apps/portfolio/data*.json` snapshots.
- `apps/portfolio/lib/hero-content-data.js` owns localized hero copy;
  `apps/portfolio/lib/hero-content.js` owns its generated structure.
- `index.html`, `index-en.html`, Japanese template transforms, manifests, and
  router helpers own locale metadata and structured-data projection. They must
  agree with the public identity and SSoT facts.
- `packages/data/resumes/master/resume_master.md` is the public PDF source.
  `tools/scripts/build/pdf-generator.go master` produces
  `packages/data/resumes/master/resume_final.pdf`; the portfolio build copies it
  to the generated static asset.
- `apps/portfolio/generate-og-image.js` owns OG composition and localized copy;
  generated PNG/WebP files are outputs, never editing surfaces.
- After source edits, run the matching generator, then `npm run build`. Never
  patch `apps/portfolio/worker.js` or generated binary/text artifacts directly.

## EXCEPTIONS

- `/resume.pdf` is served from the static `assets` binding (`assets/resume.pdf`).
  The build copies the generated master PDF into `assets/` and the worker route in
  `lib/worker-routes/seo-routes.js` reads it via `env.ASSETS.fetch()` (with a
  404 fallback) instead of inlining ~210KB of base64. This is the ONLY runtime
  asset fetch; everything else stays inlined at build.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
