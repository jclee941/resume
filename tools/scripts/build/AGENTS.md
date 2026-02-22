# BUILD SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Asset generation scripts for PDF, PPTX, icons, screenshots, and Docker images.

## SCRIPTS

| Script                       | Tool          | Output                    |
| ---------------------------- | ------------- | ------------------------- |
| `pdf-generator.sh`           | Puppeteer     | resume PDF                |
| `pptx_engine.py`             | python-pptx   | presentation slides       |
| `generate-icons.js`          | Sharp         | favicon variants          |
| `generate-screenshots.js`    | Playwright    | portfolio screenshots     |
| `generate-resume-variants.js`| Node          | role-specific resumes     |
| `docker-build.sh`            | Docker        | container images          |
| `optimize-images.js`         | Sharp         | image compression         |

## OUTPUT LOCATIONS

`portfolio-worker/assets/` or `data/resumes/generated/`.

## ANTI-PATTERNS

- Never edit generated outputs directly.
- Never commit generated artifacts to git (use `.gitignore`).
