# RESUME DATA TREE KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Canonical locale inputs, independent role variants, and supporting document corpora.

Scope reason: existing distinct canonical-versus-tailored ownership boundary.

## WHERE TO LOOK

| Task                    | Location                                                                | Notes                                  |
| ----------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| Canonical JSON contract | `master/resume_schema.json`                                             | Tracked schema                         |
| Canonical facts         | Materialized `master/resume_data.json`                                  | Portfolio and platform-sync source     |
| Locale wording          | Materialized `master/resume_data_en.json`, `master/resume_data_ja.json` | Same facts, locale-specific prose      |
| Independent variants    | `applications/AGENTS.md`                                                | Minimum contract, not master mirroring |
| Technical evidence      | Existing guide under `technical/`                                       | Compact/full document ownership        |
| Generator outputs       | Materialized output directories                                         | Secondary files, not input authority   |

## CONVENTIONS

- Only master locale JSON is canonical for portfolio generation and automated platform sync.
- Keep locale facts aligned without forcing literal translated wording.
- Treat master Markdown/PDF as derived or secondary, not competing structured sources.
- Keep role-specific narratives isolated from master facts.
- Check the content manifest before assuming a local document belongs to a tracked directory.
- Preserve existing output locations defined by generators; directory names alone do not establish authority.

## ANTI-PATTERNS

- Do not copy tailored career narratives into master without checking global truth.
- Do not make historical snapshots drive current platform synchronization.
- Do not infer a technical-document export tool exists merely from an old guide.
- Do not add an automatic master-mirroring rule to independent role variants.

Parent: [../AGENTS.md](../AGENTS.md)
