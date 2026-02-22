# PORTFOLIO WORKER KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Cloudflare Worker serving a cyberpunk terminal-style portfolio. Zero runtime I/O — all assets inlined at build time.

## STRUCTURE

```text
portfolio-worker/
├── index.html              # source HTML (hand-edited)
├── generate-worker.js      # build compiler
├── worker.js               # GENERATED — never edit
├── entry.js                # unified edge router
├── data.json               # SSoT snapshot (synced from data/)
├── dashboard.html          # admin dashboard (1290 lines)
├── lib/                    # 25 build/runtime modules (see lib/AGENTS.md)
├── src/                    # source styles/scripts (see src/AGENTS.md)
├── assets/                 # static files (favicon, og-image)
├── wrangler.toml           # worker config (name: resume)
└── validate-seo.sh         # SEO validation script
```

## WHERE TO LOOK

| Task            | Location             | Notes                               |
| --------------- | -------------------- | ----------------------------------- |
| Build pipeline  | `generate-worker.js` | HTML→CSP→inline→worker.js           |
| Source markup   | `index.html`         | hand-edited, backtick-escaped       |
| Runtime modules | `lib/`               | 25 stateless JS modules             |
| Source styles   | `src/styles/`        | CSS variables, dark-only theme      |
| Edge routing    | `entry.js`           | imports both portfolio + job worker |
| SEO assets      | `sitemap.xml`, etc.  | robots.txt, manifest.json, sw.js    |

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
