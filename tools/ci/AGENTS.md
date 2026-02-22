# CI SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-02-22 22:30:00 KST
**Commit:** 623fd03
**Branch:** master

## OVERVIEW

2 CI helper scripts. CI is validation-only; deploy via Cloudflare Workers Builds.

## SCRIPTS

| Script                          | Purpose                        |
| ------------------------------- | ------------------------------ |
| `affected.sh`                   | detect changed packages for CI |
| `validate-cloudflare-native.sh` | wrangler config guard rails    |

## CONVENTIONS

- Non-interactive, deterministic, fail-fast.
- Exit codes: 0 = pass, non-zero = fail.
- Used by `.github/workflows/ci.yml`.

## ANTI-PATTERNS

- Never skip `affected.sh` — causes unnecessary CI work.
- Never treat CI as deploy authority.
