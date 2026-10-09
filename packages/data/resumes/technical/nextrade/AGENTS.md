# TECHNICAL EVIDENCE DOCUMENTS

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Materialized technical evidence maintained in compact and full narrative forms.

Scope reason: existing distinct technical-document corpus.

## WHERE TO LOOK

| Task                   | Location                                               | Notes                                       |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Architecture narrative | Materialized `ARCHITECTURE*.md`                        | Compact and deep-dive forms when available  |
| Recovery narrative     | Materialized `DR_PLAN*.md`                             | Recovery procedures and supporting evidence |
| Operations narrative   | Materialized `SOC_RUNBOOK*.md`                         | Security operations documentation           |
| Derived documents      | Materialized PDF/DOCX files                            | Secondary exports, not editable source      |
| Canonical facts        | `../../master/resume_schema.json` and canonical inputs | Validate factual alignment before reuse     |

## CONVENTIONS

- This guide is the only tracked file in this particular technical-document directory.
- Compact narratives summarize evidence; full narratives preserve technical context.
- Check the pulled inventory before relying on any document or exporter named by older guidance.
- Keep the same verified facts across compact and full versions.
- Maintain document source before regenerating a binary export.
- Choose an exporter from the current tracked tooling or materialized packet instructions, not an assumed local script.

## ANTI-PATTERNS

- Do not present an untracked exporter as repository tooling.
- Do not infer project duration or operational claims from old guide prose.
- Do not treat a generated binary as the source for a factual update.
- Do not copy private project identifiers into tracked documentation examples.

Parent: [../../AGENTS.md](../../AGENTS.md)
