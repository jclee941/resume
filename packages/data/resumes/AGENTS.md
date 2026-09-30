# RESUME DATA TREE KNOWLEDGE BASE

**Generated:** 2026-06-10
**Commit:** `b74e95d1`
**Branch:** `master`

## OVERVIEW

Resume data subtrees contain the canonical master resume, role-specific
variants, historical archives, generated outputs, and supporting project docs.
Only `master/` is the portfolio/platform-sync SSoT.

All of it except `AGENTS.md` guides, `.gitkeep` files, and `master/resume_schema.json`
is the D1 content pack (ADR 0011): gitignored and materialized by
`npm run content:pull`. GitHub CI builds against the fake pack in
`tests/fixtures/content-pack/`. See `docs/guides/CONTENT_PACK.md`.

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
- Publish edits with `npm run content:push`; the working tree copy is not committed.

## ANTI-PATTERNS

- Do not copy role-specific prose back into `master/` without verifying it is
  globally true.
- Do not put generated artifacts outside `generated/` or documented output dirs.
- Do not use absolute local paths in resume data.
- Do not commit anything here except the schema, guides, and placeholders; the guard
  rejects pack paths.
- Do not add quantified resume/portfolio claims unless they are verifiable and
  allowed by the root instruction.

---

Parent: [../AGENTS.md](../AGENTS.md)
