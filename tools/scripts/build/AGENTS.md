# BUILD SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Asset generation pipeline for PDF, PPTX, icons, screenshots, Docker images, and
resume variants. Output ownership and tracking are format/location specific.

## SCRIPTS

| Script | Tool | Output |
| --- | --- | --- |
| `pdf-generator/` | Puppeteer | resume PDF |
| `pptx_engine.py` | python-pptx | presentation slides |
| `generate-icons.js` | Sharp | favicon variants |
| `generate-screenshots.js` | Playwright | portfolio screenshots |
| `generate-resume-variants.js` | Node | role-specific resumes |
| `docker-build.go` | Docker | container images |
| `optimize-images.js` | Sharp | image compression |

## OUTPUT LOCATIONS

- `apps/portfolio/assets/` — public-facing assets (icons, screenshots, OG images)
- `packages/data/resumes/generated/` — derived resume variants
- `applications/*/` — company-specific resume snapshots

## CONVENTIONS

- Track application PDFs and designated source-like outputs; `.gitignore`
  excludes generated master/variant PDFs and temporary reports.
- Preserve reproducibility where explicitly enforced, notably the Go PDF
  renderer; browser screenshots and dated indexes are not byte-stable artifacts.
- Snapshots are owned by this guide; do not edit them by hand.

## ANTI-PATTERNS

- Never edit generated outputs directly.
- Never skip generation steps in the build pipeline.
- Never claim byte-for-byte reproducibility for generators that encode dates or
  browser-rendered state.

---

Parent: [../AGENTS.md](../AGENTS.md)
