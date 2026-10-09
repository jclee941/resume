# INDEPENDENT APPLICATION VARIANTS

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Hand-authored role-specific resume JSON and prose with a deliberately smaller validation contract.

Scope reason: existing distinct variant-schema boundary.

## WHERE TO LOOK

| Task              | Location                                                           | Notes                                         |
| ----------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Variant validator | `../../../../tools/scripts/utils/validate-application-variants.js` | Recursive JSON discovery and minimum contract |
| JSON sources      | Materialized role directories                                      | Role-specific fields and descriptions         |
| Narrative sources | Materialized Markdown beside variants                              | Cover letters and question responses          |
| Master comparison | `../master/resume_schema.json`                                     | Reference only; not the variant schema        |

## CONVENTIONS

- Required top-level keys: `personal`, `summary`, `careers`, `projects`, `skills`, `certifications`.
- Personal contact fields are `name`, `email`, and `phone`; the validator rejects empty values when inspecting the object.
- Careers must be an array, and entries require nonempty `company` and `period`.
- Skills follow the nonempty category-object convention rather than master parity.
- Career prose, skill categories, and `summary.expertise` may differ by role.
- The validator discovers JSON recursively; prose documents are outside its schema checks.
- Run `node tools/scripts/utils/validate-application-variants.js` from the repository root after editing a variant.
- An empty materialized directory yields a successful no-variants result, not evidence that all expected packets were pulled.

## ANTI-PATTERNS

- Do not enforce the complete master top-level shape on these variants.
- Do not extend master sync to overwrite role-specific JSON or narratives.
- Do not use a named historical packet as a universally available template.
- Do not mistake minimum-contract validation for factual or cross-platform parity review.

Parent: [../AGENTS.md](../AGENTS.md)
