# PORTFOLIO SOURCE KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Browser CSS and feature modules composed into the generated portfolio Worker.

Scope reason: score 9; distinct browser-source domain.

## WHERE TO LOOK

| Task                  | Location                                     | Notes                                                  |
| --------------------- | -------------------------------------------- | ------------------------------------------------------ |
| CSS composition       | `styles/main.css`                            | Ordered import graph                                   |
| Design tokens         | `styles/variables.css`                       | Color, spacing, and typography source                  |
| Browser bootstrap     | `scripts/main.js`                            | Feature initialization and service-worker registration |
| ESM loading           | `scripts/package.json`                       | Module marker used by Node and Jest                    |
| Shared DOM formatting | `scripts/modules/project-card-formatting.js` | Escaping, icons, technology classes                    |
| Recruiter features    | `scripts/modules/recruiter-*.js`             | Role proofs, interactions, mobile actions              |
| Timeline              | `scripts/modules/timeline*.js`               | View model, interactions, rendering                    |
| Theme contract        | `scripts/modules/theme.js`                   | Dark-only compatibility behavior                       |

## CONVENTIONS

- Preserve CSS import order; cascade order is part of feature behavior.
- Keep component changes aligned with CJK, print, forced-color, and reduced-motion styles.
- Compose feature `init*` functions in the bootstrap rather than adding competing entry points.
- Dynamic text must be escaped before DOM insertion.
- Preserve keyboard operation, focus restoration/trapping, and ARIA state for overlays.
- Locale data and labels must remain aligned across KO, EN, and JA modules.
- Imported `*-data.js` modules are materialized content inputs; they are not a new code-source location.

## ANTI-PATTERNS

- Do not add one-off visual values outside `styles/variables.css` and the existing token system.
- Do not restore a light-mode/localStorage theme path alongside the dark-only contract.
- Do not expose browser globals unless the bootstrap deliberately owns the public action.
- Do not initialize the same feature independently from multiple modules.

Parent: [../AGENTS.md](../AGENTS.md)
