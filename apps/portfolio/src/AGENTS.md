# PORTFOLIO SOURCE KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Editable browser CSS and JavaScript. `main.css` and `scripts/main.js` are the
composition roots consumed by the Worker build.

## STRUCTURE

```text
src/
├── styles/
│   ├── main.css       # ordered CSS import graph
│   └── variables.css  # design-token source
└── scripts/
    ├── main.js        # browser bootstrap and service-worker registration
    └── modules/       # project, timeline, recruiter, skills, UI, Web Vitals
```

## CONVENTIONS

- Preserve `main.css` import order; cascade order is part of component behavior.
- Reuse tokens from `variables.css`; keep responsive, CJK, print, forced-color,
  and reduced-motion rules aligned with component changes.
- Keep browser modules focused and compose them in `scripts/main.js`.
- Escape dynamic text before DOM insertion and use CSP-compatible CSS custom
  properties for dynamic visual values.
- Preserve keyboard operation, focus restoration/trapping, ARIA state, and
  reduced-motion behavior for interactive features.
- Keep locale data paths and labels consistent across KO, EN, and JA surfaces.

## ANTI-PATTERNS

- Do not edit generated `worker.js` for source behavior or styling.
- Do not add one-off colors, spacing, or typography outside the token system.
- Do not add global browser functions unless the bootstrap deliberately exposes
  a stable action.
- Do not cache HTML in `sw.js`; response CSP nonces are request-specific.
- Do not restore the removed light-mode/localStorage theme path.

---

Parent: [../AGENTS.md](../AGENTS.md)
