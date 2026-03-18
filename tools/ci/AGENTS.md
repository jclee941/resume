# CI SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-03-17
**Commit:** `882b837`
**Branch:** `master`

## OVERVIEW

2 CI helper scripts. CI is validation-only; deploy via Cloudflare Workers Builds.

## SCRIPTS

| Script                          | Purpose                        |
| ------------------------------- | ------------------------------ |
| `affected.go`                   | detect changed packages for CI |
| `validate-cloudflare-native.go` | wrangler config guard rails    |

## CONVENTIONS

- Non-interactive, deterministic, fail-fast.
- Exit codes: 0 = pass, non-zero = fail.
- Used by `.github/workflows/ci.yml`.

## ANTI-PATTERNS

- Never skip `affected.go` — causes unnecessary CI work.
- Never treat CI as deploy authority.
