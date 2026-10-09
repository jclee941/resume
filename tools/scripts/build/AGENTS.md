# BUILD SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Tracked generators and publication helpers for PDF/PPTX presentations, resume variants, icons, and screenshots.

Boundary: retained multi-format build domain with renderer-specific output contracts.

## WHERE TO LOOK

| Task                 | Location                                                             | Notes                                          |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| PDF CLI and variants | `pdf-generator/main.go`, `pdf-generator/catalog.go`                  | Variant selection                              |
| PDF rendering        | `pdf-generator/renderer.go`, `pdf-generator/layout.go`               | Pandoc/XeLaTeX and Docker fallback             |
| PDF normalization    | `pdf-generator/reproducibility.go`                                   | Deterministic metadata handling                |
| Presentation engine  | `pptx_engine.py`, `pptx_layouts.py`, `pptx_templates.py`             | Shared template pipeline                       |
| TA presentation      | `generate_ta_pptx.py`, `pptx_ta.py`                                  | TA wrapper and slide assembly                  |
| Presentation CLI     | `generate_pptx.py`                                                   | Template/profile selection and output override |
| PPTX inspection      | `pptx_tool.py`                                                       | verify, dump, titles, fix-typos subcommands    |
| PPTX publication     | `pptx_publication.py`                                                | ZIP validation and atomic replacement          |
| Role variants        | `generate-resume-variants.js`, `resume-variant-*.js`                 | Config, content, generation, archives          |
| Image assets         | `generate-icons.js`, `convert-icons-to-png.js`, `optimize-images.js` | Sharp-based processing                         |
| Browser captures     | `generate-screenshots.js`                                            | Playwright screenshots                         |
| Rendering filters    | `resume-style.tex`, `resume-photo.lua`, `strip-emoji.lua`            | PDF style, photo, text filters                 |

## CONVENTIONS

- `npm run sync:pdf` runs master and full variants through the Go PDF generator.
- PDF generation uses native Pandoc when available and otherwise a Docker renderer; it is not a Puppeteer pipeline.
- PDF output is normalized in a sibling temporary file before replacement; preserve existing output on failure.
- Master-derived PDFs include the shared photo; submitted per-company documents keep their submitted form.
- `npm run sync:pptx` selects the TA template; `npm run test:python` covers profile and publication behavior.
- PPTX publication rejects symlink destinations, checks the presentation ZIP entry, and replaces only validated output.
- PDF tests run through `go -C tools/scripts test ./build/pdf-generator`.
- Browser screenshots and date-bearing indexes are not guaranteed byte-stable outputs.
- Python wrappers import through `build.*`; tests use `tools.scripts.build.*`; package modules use relative imports.
- The build-directory gitignore allowlist admits selected source extensions and requirements, not arbitrary new files.
- Pass an explicit file to `pptx_tool.py`; its legacy default path is not the template-owned destination.
- PPTX font verification prints diagnostics; a zero exit status does not guarantee every printed check passed.

## ANTI-PATTERNS

- Do not label application PDFs as tracked artifacts; output location does not override pack ownership.
- Do not replace atomic output publication with direct writes to the final file.
- Do not claim renderer reproducibility without using the normalization contract.
- Do not use a generator's local destination as a new authoritative data source.

---

Parent: [../AGENTS.md](../AGENTS.md)
