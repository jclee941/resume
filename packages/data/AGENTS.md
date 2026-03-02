# DATA KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Single Source of Truth (SSoT) for all resume variants.

## STRUCTURE

```text
data/
└── resumes/
    ├── master/           # canonical JSON + MD
    │   └── resume_data.json  # SSoT (authoritative)
    ├── technical/        # project specs (nextrade/)
    ├── applications/     # role-specific variants
    ├── archive/          # 2018-2025 historical
    └── generated/        # build artifacts (git-ignored)
```

## DATA FLOW

```
resume_data.json → npm run sync:data → portfolio-worker/data.json
                                     → worker build pipeline
```

## CONVENTIONS

- `resume_data.json` is the single authoritative source.
- Markdown → PDF only (no reverse).
- Skills use `{name, level}` objects.
- `npm run sync:data` propagates changes.

## ANTI-PATTERNS

- Never edit PDFs directly — edit source, regenerate.
- Never put loose files outside the resumes/ hierarchy.
- Never let derived artifacts drift from SSoT.
- Never use absolute paths in data references.
