# SUPABASE EDGE FUNCTIONS KNOWLEDGE BASE

**Generated:** 2026-06-10
**Commit:** `b74e95d1`
**Branch:** `master`

## OVERVIEW

Supabase Edge Functions are a distinct Deno runtime outside the npm workspace
packages. They currently provide secret access helpers through Supabase auth and
RPC calls.

## STRUCTURE

```text
functions/
└── get-secret/
    ├── index.ts        # Deno.serve handler
    └── jsr-shims.d.ts  # local type shims for JSR imports
```

## CONVENTIONS

- Use Deno/Supabase Edge Function APIs, not Node-only APIs.
- Authenticate callers before returning secret material.
- Keep service-role keys in Supabase environment variables only.
- JSR import shims belong beside the function when local type tooling needs
  them.

## ANTI-PATTERNS

- Do not commit Supabase service-role keys, anon keys, JWTs, or secret payloads.
- Do not bypass `supabase.auth.getUser()` for secret reads.
- Do not log secret names together with returned secret values.
- Do not assume npm workspace scripts build or test this runtime.

---

Parent: [../../AGENTS.md](../../AGENTS.md)
