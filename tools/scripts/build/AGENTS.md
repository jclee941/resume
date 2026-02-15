# BUILD SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-01-30
**Commit:** 0b7a931e
**Parent:** [`../AGENTS.md`](../AGENTS.md)

## OVERVIEW

Asset generation scripts for resume artifacts (PDF, PPTX, icons, screenshots).
These scripts are the "Build" step for the static assets used by the portfolio worker.

## SCRIPT CATEGORIES

| Category        | Scripts                                        | Purpose                                 |
| --------------- | ---------------------------------------------- | --------------------------------------- |
| **PDF**         | `pdf-generator.sh`                             | HTML→PDF via Puppeteer                  |
| **PPTX**        | `pptx_*.py`                                    | PowerPoint generation (python-pptx)     |
| **Icons**       | `generate-icons.js`, `convert-icons-to-png.js` | Favicon/app icon generation             |
| **Screenshots** | `generate-screenshots.js`                      | Portfolio screenshots via Playwright    |
| **Variants**    | `generate-resume-variants.js`                  | Generate resume from `resume_data.json` |
| **Docker**      | `docker-build.sh`                              | Container image builds                  |
| **Images**      | `optimize-images.js`                           | Image compression/optimization          |

## PPTX SUBSYSTEM

Python-based PowerPoint generator using `python-pptx`.

```
pptx_engine.py      # Core slide generation logic
pptx_templates.py   # Slide layout definitions
pptx_utils.py       # Helper functions
pptx_tool.py        # CLI entry point
generate_pptx.py    # Main generator script
```

## CONVENTIONS

- **Idempotency**: All scripts are safe to re-run.
- **Fail-Fast**: Bash scripts use `set -e`.
- **Outputs**: Artifacts go to `typescript/portfolio-worker/assets/` or `typescript/data/`.

## ANTI-PATTERNS

- **NEVER** commit generated artifacts without regenerating from source.
- **NEVER** hardcode paths - use relative paths from project root.
