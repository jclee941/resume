# PORTFOLIO SOURCE KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

Source files for portfolio markup, modular styles, and theme behavior. Edit
here, not in generated `worker.js`.

## STRUCTURE

```text
src/
├── styles/
│   ├── variables.css       # design tokens (colors, spacing, fonts)
│   ├── base.css            # dark-only defaults, resets
│   ├── components.css      # cards, hero, skill-bars
│   ├── layout.css          # grid, flex containers
│   ├── media.css           # responsive breakpoints
│   └── utilities.css       # glow, gradient, animations
└── scripts/
    └── modules/
        └── theme.js        # dark-only theme enforcement
```

## KEY CSS SELECTORS

`.page-shell`, `.hero-title`, `.section-title`, `.card`, `.project-list`,
`.skill-radar__grid`, `.timeline`.

## CONVENTIONS

- Dark-only theme — no light-mode toggle.
- Reuse CSS variables from `variables.css`.
- Mobile-safe animations (reduce-motion media query).
- `.section-title` and `.card` used across generated markup.

## ANTI-PATTERNS

- Never add light-mode without root doc update.
- Never use localStorage theme toggling.
- Never duplicate design tokens outside `variables.css`.
- Never edit generated `worker.js` for style changes.

---

Parent: [../../../AGENTS.md](../../../AGENTS.md)
