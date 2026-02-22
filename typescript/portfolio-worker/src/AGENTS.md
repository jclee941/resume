# PORTFOLIO SOURCE KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Source files for portfolio markup, modular styles, and theme behavior. Edit here, not in generated `worker.js`.

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

`.terminal-window`, `.cli-container`, `#cli-input`, `.typing-effect`, `.glitch`, `.skill-bar`.

## CONVENTIONS

- Dark-only theme — no light-mode toggle.
- Reuse CSS variables from `variables.css`.
- Mobile-safe animations (reduce-motion media query).
- `.typing-effect` and `.skill-bar` used in generated markup.

## ANTI-PATTERNS

- Never add light-mode without root doc update.
- Never use localStorage theme toggling.
- Never duplicate design tokens outside `variables.css`.
- Never edit generated `worker.js` for style changes.
