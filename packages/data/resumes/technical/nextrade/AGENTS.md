# NEXTRADE PROJECT DOCS

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

**Scope:** `packages/data/resumes/technical/nextrade/`
**Type:** Technical documentation (architecture, DR, SOC)

## OVERVIEW

Nextrade securities exchange project documentation. Covers 24 months of construction and operations phases. Architecture, disaster recovery plan, and SOC runbook available in compact (resume-ready) and full (technical deep-dive) variants.

## FILES

- `ARCHITECTURE*.md` — System architecture (compact + full)
- `DR_PLAN*.md` — Disaster recovery procedures (compact + full)
- `SOC_RUNBOOK*.md` — Security operations guide (compact + full)
- `convert-to-pdf-docx.go` — Export script (Go, not shell)
- `nextrade_*.docx` — Pre-generated DOCX exports

## CONVENTIONS

- `nextrade_` prefix for binary artifacts
- Compact variants for quick reference; full variants for technical detail
- Export via Go script, not shell

## ANTI-PATTERNS

- Never edit PDFs/DOCX directly. Edit markdown, regenerate.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
