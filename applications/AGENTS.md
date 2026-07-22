# APPLICATION PACKETS

**Generated:** 2026-06-28
**Commit:** `76f0a897`
**Branch:** `master`

## OVERVIEW

Top-level per-role application corpus: tailored resumes, cover letters, HTML/PDF
previews, screenshots, and auto-apply run outputs outside npm workspaces.

## STRUCTURE

```text
applications/
├── DESIGN.md                 # application PDF visual system
├── _auto-apply-runs/         # generated/ranked submission queues and run logs
├── <company-role-year>/      # role-specific packet source and generated output
└── infrastructure-architecture-2026/
```

## WHERE TO LOOK

| Task                         | Location                              | Notes                                                   |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------- |
| PDF/application visual rules | `DESIGN.md`                           | extend design tokens before adding raw colors/styles    |
| Generated run output         | `_auto-apply-runs/`                   | automation artifacts; do not hand-edit for source truth |
| Role packet source           | `<company-role-year>/cover_letter.md` | tailored copy source when present                       |
| Role resume preview          | `<company-role-year>/*.html`          | generated or hand-authored preview depending on packet  |
| Role PDF                     | `<company-role-year>/*.pdf`           | output artifact; regenerate from source where possible  |

## CONVENTIONS

- Treat this directory as application content, not application code.
- Keep each role packet isolated in a slugged directory named for company, role,
  and year.
- Keep generated run logs under `_auto-apply-runs/`; do not move them into
  source package data.
- Follow `applications/DESIGN.md` for application HTML/PDF styling.
- Keep claims conservative and sourced from the resume SSoT or role-specific
  evidence. Tailoring may reframe facts; it must not invent facts.
- Prefer editing markdown/source inputs, then regenerating HTML/PDF outputs.

## ANTI-PATTERNS

- Never commit credentials, session tokens, private recruiter messages, or raw
  platform cookies in application packets or run logs.
- Never hand-edit generated ranked queues, submission result JSON, or PDFs when
  a source input or generator can produce the change.
- Never introduce concrete performance metrics into resume/application copy.
  Describe outcomes factually without percentages, ratios, or absolute numbers.
- Never let role-specific tailoring drift back into `packages/data/resumes/master`
  unless it is true for the canonical resume.
- Never add JavaScript-dependent content to application PDFs; packet previews
  must remain printable/static.

Parent: [../AGENTS.md](../AGENTS.md)
