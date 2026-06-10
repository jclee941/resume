# RESUME DATA TREE KNOWLEDGE BASE

**Generated:** 2026-06-10
**Commit:** `b74e95d1`
**Branch:** `master`

## OVERVIEW

Resume data subtrees contain the canonical master resume, role-specific
variants, historical archives, generated outputs, and supporting project docs.
Only `master/` is the portfolio/platform-sync SSoT.

## STRUCTURE

```text
resumes/
├── master/        # canonical JSON/Markdown/PDF source for portfolio + sync
├── applications/  # hand-crafted role-specific variants (see child AGENTS)
├── generated/     # derived PDFs/PPTX/Markdown outputs
├── technical/     # project-specific technical source docs
├── wishket/       # Wishket proposal/portfolio material
└── archive/       # historical resume snapshots
```

## CONVENTIONS

- Edit `master/resume_data.json` for canonical resume facts.
- Keep locale variants (`resume_data_en.json`, `resume_data_ja.json`) aligned
  with master intent.
- Treat `applications/` as intentionally independent; its child AGENTS overrides
  master-parity assumptions.
- Regenerate derived files through project commands instead of hand-editing
  generated PDFs/PPTX/Markdown.

## ANTI-PATTERNS

- Do not copy role-specific prose back into `master/` without verifying it is
  globally true.
- Do not put generated artifacts outside `generated/` or documented output dirs.
- Do not use absolute local paths in resume data.
- Do not add quantified resume/portfolio claims unless they are verifiable and
  allowed by the root instruction.

---

Parent: [../AGENTS.md](../AGENTS.md)
