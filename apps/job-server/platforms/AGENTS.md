# PLATFORM ADAPTERS KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Profile/crawler adapters for Wanted, JobKorea, Saramin, LinkedIn, Remember,
Indeed, Jumpit, Programmers, Rallit, and RocketPunch.

## STRUCTURE

Shared adapter bases live in `base-profile-sync.js` and
`browser-profile-sync.js`; platform directories own endpoint, parsing, and
anti-detection differences. `sync-platforms.js` is the command adapter.

## CONVENTIONS

- Isolate credentials, sessions, selectors, payload mapping, and rate limits by
  platform.
- Reuse shared base behavior only when the platform contract is truly common.
- Keep preview/diff paths separate from mutation and real submission paths.
- Return explicit unsupported/partial results instead of silently dropping data.
- Treat platform content as untrusted input before it reaches matching or LLMs.

## ANTI-PATTERNS

- Never share cookies or account state across platforms.
- Never hardcode credentials, account IDs, resume IDs, tokens, or auth headers.
- Never default to LinkedIn website automation; require explicit approval.
- Never weaken one platform's safety gates to fit a shared abstraction.
- Never perform irreversible profile/application mutation from tests or dry runs.

---

Parent: [../AGENTS.md](../AGENTS.md)
