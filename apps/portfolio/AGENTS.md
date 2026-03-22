# PORTFOLIO WORKER KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Cloudflare Worker serving a cyberpunk terminal-style portfolio. Zero runtime I/O — all assets inlined at build time.

## STRUCTURE

```text
portfolio/
├── index.html              # source HTML (hand-edited)
├── index-en.html           # English portfolio source
├── generate-worker.js      # build compiler
├── worker.js               # GENERATED — never edit
├── entry.js                # edge router (proxies /job/* via Service Binding)
├── data.json               # SSoT snapshot (KO)
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
├── wrangler.toml           # worker config (name: resume)
└── validate-seo.sh         # SEO validation script
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

```
resume_data.json → sync → data.json
index.html → generate-worker.js → worker.js → wrangler deploy
                 ↓
         escape backticks
         compute CSP hashes
         inline CSS + data
```

## CLI COMMANDS

`help`, `whoami`, `pwd`, `date`, `ls`, `cat`, `snake`, `clear`.

## CONVENTIONS

- All assets inlined at build — no runtime fetch.
- CSS vars for theming (see `src/styles/variables.css`).
- Pure functions in `lib/` — receive env, no side effects.
- Fire-and-forget telemetry (ES logger, metrics).
- Multi-language: `data.json` (ko), `data_en.json`, `data_ja.json`.

## ANTI-PATTERNS

- Never edit `worker.js` directly — it is generated.
- Never `trim()` inline scripts before CSP hash generation.
- Never add runtime fetch for assets — inline at build.
- Never hardcode colors — use CSS variables.
- Never add light-mode without updating root docs.
