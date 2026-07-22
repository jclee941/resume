# DATA KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

**Scope:** `packages/data/`
**Type:** Canonical resume and application content SSoT

## OVERVIEW

Canonical resume and application content. `resumes/master/resume_data.json` and
its locale JSON peers are the structured sources; Markdown, PDFs, generated
variants, and platform snapshots are secondary outputs or independent corpora.

## STRUCTURE

```text
packages/data/
├── resumes/
│   ├── master/           # Canonical locale JSON; Markdown/PDF are secondary
│   ├── applications/     # Hand-crafted role-specific variants (intentionally independent)
│   ├── technical/        # Project-specific technical docs (Nextrade, etc.)
│   ├── generated/        # Tracked derived resume/PPTX outputs
│   ├── archive/          # Historical snapshots (2018-2025)
│   └── wishket/          # Wishket proposal material
├── platforms/         # Platform-specific mappings
└── proposals/         # Enrichment proposal lifecycle (approved/applied/rejected)
```

## DATA FLOW

```
master/resume_data.json → npm run sync:data → portfolio-worker/data.json
                                             → build pipeline
```

## CONVENTIONS

- `master/resume_data.json` is authoritative for Korean portfolio and platform
  sync; `resume_data_en.json` and `resume_data_ja.json` are canonical locale sources.
- Keep locale facts aligned while preserving locale-specific wording.
- `applications/` is intentionally independent; see its child AGENTS for contract details.
- Regenerate derived files through project commands, not hand-editing.

## ANTI-PATTERNS

- Never edit PDFs directly. Edit source, regenerate.
- Never put loose files outside the resumes/ hierarchy.
- Never let derived artifacts drift from SSoT.
- Never use absolute paths in data references.

---

Parent: [../AGENTS.md](../AGENTS.md)
