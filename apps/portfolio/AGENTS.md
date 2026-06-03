# PORTFOLIO WORKER KNOWLEDGE BASE

**Generated:** 2026-04-19
**Commit:** `133c230`
**Branch:** `master`

## OVERVIEW

Cloudflare Worker serving a clean dark-neutral portfolio (DevSecOps/SRE
positioning). Almost all assets are inlined at build time; the exception is the
resume PDF, which is served from the static `assets` binding via `env.ASSETS`
(see EXCEPTIONS) to keep it out of the worker bundle.

## STRUCTURE

```text
portfolio/
├── index.html              # source HTML (hand-edited)
├── index-en.html           # English portfolio source
├── generate-worker.js      # build compiler
├── worker.js               # GENERATED — never edit
├── entry.js                # edge router (proxies /job/* via Service Binding)
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

| Task            | Location                      | Notes                                                |
| --------------- | ----------------------------- | ---------------------------------------------------- |
| Build pipeline  | `generate-worker.js`          | HTML→CSP→inline→worker.js                            |
| Source markup   | `index.html`, `index-en.html` | KO/EN portfolio templates                            |
| Runtime modules | `lib/`                        | 25 stateless JS modules                              |
| Multi-language  | `i18n.js`, `data_*.json`      | KO/EN/JA support                                     |
| OG Image Gen    | `generate-og-image.js`        | Canvas-based social image generation                 |
| Project Schemas | `*project-schemas.js`         | JSON-LD generation and injection                     |
| SEO/Metadata    | `SEO_IMPLEMENTATION.md`       | sitemap, robots, meta tags                           |
| Edge routing    | `entry.js`                    | proxies /job/\* to job-dashboard via Service Binding |

## BUILD PIPELINE

```text
resume_data.json → sync → data.json
index.html → generate-worker.js → worker.js → wrangler deploy
                 ↓
         escape backticks
         compute CSP hashes
         inline CSS + data
```

## CLI COMMANDS

`help`, `whoami`, `pwd`, `date`, `ls`, `cat`, `about`, `resume`, `projects`,
`skills`, `contact`, `social`, `neofetch`, `snake`, `clear`.

## CONVENTIONS

- Inline assets at build time; the sole exception is `resume.pdf` (served via `env.ASSETS`).
- CSS vars for theming (see `src/styles/variables.css`).
- Pure functions in `lib/` — receive env, no side effects.
- Fire-and-forget telemetry (ES logger, metrics).
- Multi-language: `data.json` (ko), `data_en.json`, `data_ja.json`.

## ANTI-PATTERNS

- Never edit `worker.js` directly — it is generated.
- Never `trim()` inline scripts before CSP hash generation.
- Never add runtime fetch for assets — inline at build (EXCEPTION: `/resume.pdf` reads `env.ASSETS`).
- Never hardcode colors — use CSS variables.
- Never add light-mode without updating root docs.

## CONTENT UPDATE PATTERN

Hardcoded content in `index.html`/`index-en.html` must match SSoT
(`resume_data.json`):

- Title/meta/OG/Twitter tags: `보안 엔지니어` (ko) / `Security Engineer` (en) / `セキュリティエンジニア` (ja)
- JSON-LD Person schema: `knowsAbout` (12 domains), `jobTitle`, `description`
- About section: career highlights (quantified achievements), current focus
- Hero subtitle, neofetch command, terminal `whoami`/`cat about.txt` responses
- After edits: `npm run sync:data && npm run build` to regenerate `worker.js`

## EXCEPTIONS

- `/resume.pdf` is served from the static `assets` binding (`assets/resume.pdf`).
  The build copies the SSoT PDF into `assets/` and the worker route in
  `lib/worker-routes/seo-routes.js` reads it via `env.ASSETS.fetch()` (with a
  404 fallback) instead of inlining ~210KB of base64. This is the ONLY runtime
  asset fetch; everything else stays inlined at build.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
