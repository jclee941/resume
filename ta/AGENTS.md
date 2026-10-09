# TA PROFILE GENERATION KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Materialized TA presentation workspace; only this guidance file is tracked in this subtree.

Boundary: retained distinct presentation-content domain outside npm workspaces.

## WHERE TO LOOK

| Task                     | Repository location                       | Notes                             |
| ------------------------ | ----------------------------------------- | --------------------------------- |
| Tracked generation entry | `tools/scripts/build/generate_ta_pptx.py` | Thin TA template wrapper          |
| Presentation engine      | `tools/scripts/build/pptx_engine.py`      | Shared generation pipeline        |
| TA layout behavior       | `tools/scripts/build/pptx_ta.py`          | TA-specific slide assembly        |
| Template selection       | `tools/scripts/build/pptx_templates.py`   | Generator-owned output selection  |
| Safe publication         | `tools/scripts/build/pptx_publication.py` | Validation and atomic replacement |
| Generation rules         | `tools/scripts/build/AGENTS.md`           | Tracked build-tool domain         |

## CONVENTIONS

- `npm run sync:pptx` invokes the tracked TA generator, not a script inside this directory.
- `npm run test:python` discovers the tracked PPTX profile and publication tests.
- A clean checkout has no guaranteed local TA inspection scripts or output folders.
- Resolve output paths from the selected template instead of assuming `ta/output/`.
- Local presentation utilities are materialized content, not an alternate supported build pipeline.

## ANTI-PATTERNS

- Do not document local-only `verify.py` or inspection scripts as repository commands.
- Do not add this content directory to npm workspaces.
- Do not move generation logic here from the tracked build tools.
- Do not treat a locally present PPTX as a tracked source artifact.

---

Parent: [../AGENTS.md](../AGENTS.md)
