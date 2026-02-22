# CLI KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

Commander.js CLI for resume operations. ESM only.

## STRUCTURE

```text
cli/
├── bin/
│   └── run.js          # entry point (loads root .env)
├── src/
│   └── commands/
│       ├── deploy.js   # deployment command
│       └── verify.js   # verification command
└── package.json
```

## CONVENTIONS

- ESM imports only.
- Root `.env` loaded at entry via `dotenv`.
- Commands are self-contained in `src/commands/`.

## ANTI-PATTERNS

- Never store secrets in CLI code.
- Never bypass verification steps.
- Never hardcode URLs — use env vars.
