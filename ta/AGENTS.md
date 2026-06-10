# TA PROFILE GENERATION KNOWLEDGE BASE

**Generated:** 2026-06-10
**Commit:** `b74e95d1`
**Branch:** `master`

## OVERVIEW

TA contains Python scripts and PPTX artifacts for presentation/profile
generation. It is not an npm workspace package.

## STRUCTURE

```text
ta/
├── inspect.py        # PPTX overflow/data inspection
├── improve_visual.py # PPTX visual adjustment script
├── verify.py         # PPTX verification/report extraction
├── output/           # generated verification reports and PPTX outputs
└── *.pptx            # source/output presentation artifacts
```

## CONVENTIONS

- Use Python tooling for PPTX inspection and generation.
- Keep generated reports and output presentations in `output/` unless a script
  explicitly documents another target.
- Prefer relative repo paths in new scripts; existing absolute paths are legacy
  and should not be copied.
- Verify generated PPTX output with `verify.py` after visual changes.

## ANTI-PATTERNS

- Do not add TA scripts to npm workspaces.
- Do not commit credentials, private profile source data, or temp extraction
  folders.
- Do not hand-edit generated verification reports when a script can regenerate
  them.
- Do not introduce `.sh` operational wrappers; use Python or existing Go
  tooling as appropriate.

---

Parent: [../AGENTS.md](../AGENTS.md)
