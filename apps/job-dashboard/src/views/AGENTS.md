# VIEWS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Dashboard views generate the self-contained dashboard HTML, inline scripts, and
inline CSS used by the Worker. This is operational UI, not marketing content.

## STRUCTURE

```text
views/
├── dashboard.js       # HTML shell and dashboard markup
├── scripts.js         # script bundle assembly
├── scripts/           # automation, applications, resume-sync, core state
├── styles.js          # style bundle assembly
└── styles/            # variables, layout, components, tables, forms, etc.
```

## CONVENTIONS

- Keep scripts split by workflow surface (`automation`, `applications`,
  `resume-sync`, shared `core`/`state`).
- Escape user-controlled text before inserting into HTML strings.
- Prefer existing CSS variables and component style modules over one-off colors.
- Keep the UI dense and operations-focused; this dashboard is for repeated
  job-automation work.

## ANTI-PATTERNS

- Do not fetch third-party assets from dashboard views.
- Do not place secrets, session tokens, or webhook credentials in generated UI.
- Do not add broad global functions unless `scripts/core.js` needs to expose a
  deliberate dashboard action.
- Do not move API behavior into view scripts when a handler/service owns it.

---

Parent: [../AGENTS.md](../AGENTS.md)
