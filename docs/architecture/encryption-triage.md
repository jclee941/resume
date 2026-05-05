# Encryption Implementation Triage — SSOT-033 / Issue #42

**Status**: Active triage · **Owner**: Platform/Security · **Last Updated**: 2026-05-05

This document maps every cryptographic implementation in the monorepo, decides
which are runtime-justified divergences (Web Crypto vs Node `crypto`) versus
true duplication, and prescribes the canonical home structure (per-runtime
subpath exports under `packages/shared/src/crypto/`).

---

## Inventory

### A. `apps/job-dashboard/src/utils/crypto.js` (56 LOC)

**Runtime**: Cloudflare Worker (Web Crypto API).
**Algorithm**: `AES-GCM` (256-bit key derived from base64 env), 12-byte IV.
**Purpose**: Symmetric encryption of opaque blobs in D1/KV (e.g. encrypted
session payloads, OAuth refresh tokens).

| Export                             | Signature                                            | Notes                                                           |
| ---------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `getKey(env)`                      | `async (env) -> CryptoKey`                           | Reads `env.ENCRYPTION_KEY` (base64), imports as raw AES-GCM key |
| `encrypt(env, plaintext)`          | `async (env, string) -> { ciphertext, iv }` (base64) | Generates random 12-byte IV                                     |
| `decrypt(env, { ciphertext, iv })` | `async (env, payload) -> string`                     | Reverses `encrypt`                                              |

### B. `apps/job-server/src/session-broker/services/encryption-service.js` (99 LOC)

**Runtime**: Node.js (`node:crypto`).
**Algorithm**: `aes-256-gcm`, 16-byte IV, 16-byte auth tag.
**Purpose**: Symmetric encryption of Wanted session payloads written to disk
in the session broker (Docker-hosted, port 3456). TTL-aware envelope.

| Export                                 | Signature              | Notes                                                 |
| -------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `EncryptionService` class              | `new (options)`        | Reads `options.key` or `SESSION_ENCRYPTION_KEY` (hex) |
| `.encrypt(plaintext)`                  | `(string) -> string`   | Returns `iv:authTag:ciphertext` joined string         |
| `.decrypt(envelope)`                   | `(string) -> string`   | Verifies authTag, throws on mismatch                  |
| `.wrap(payload)` / `.unwrap(envelope)` | wrap with TTL metadata | Used by SessionBrokerService                          |

### C. `apps/portfolio/lib/auth.js` (179 LOC) — **codegen, not runtime crypto**

**Runtime**: Build-time codegen for the portfolio Cloudflare Worker.
**Algorithm**: HMAC-SHA256 (signing/verification of Google ID tokens, session
cookies). Uses Web Crypto API at runtime; this file produces **string source**
that is template-literal-embedded into `worker.js` at build time.

| Function              | Returns       | Embeds in worker as                                            |
| --------------------- | ------------- | -------------------------------------------------------------- |
| `verifyGoogleToken()` | string source | `async function verifyGoogleToken(token) { ... }`              |
| `signMessage()`       | string source | `async function signMessage(message, secret) { ... }`          |
| `verifySignature()`   | string source | `async function verifySignature(message, sig, secret) { ... }` |
| `verifySession()`     | string source | session-cookie validation runtime                              |

**Note**: this is fundamentally a different concern (HMAC signing for cookie
integrity, OAuth ID-token verification) than A/B (symmetric AES-GCM
encryption of stored blobs). It is mis-categorized in the issue body as
"three crypto implementations".

---

## Identical / Divergent Decisions

| Pair                  | Status                                                                                                     | Decision                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A vs B (both AES-GCM) | **Runtime-justified divergence** (Web Crypto vs `node:crypto`) but algorithm-compatible (both AES-256-GCM) | Promote to `packages/shared/src/crypto/` with **per-runtime subpath exports** |
| A vs C                | **Different concern** (encryption vs HMAC signing)                                                         | Keep both; C is codegen embedded into worker                                  |
| B vs C                | **Different concern + different runtime**                                                                  | Keep both                                                                     |

---

## Algorithm Choice Audit

| Concern                          | Current state                                                       | Canonical                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Symmetric encryption algorithm   | A: AES-GCM (256-bit) · B: AES-256-GCM                               | **AES-256-GCM** ✅ aligned                                                                                             |
| IV length                        | A: 12 bytes (Web Crypto convention) · B: 16 bytes (Node convention) | Standardize on **12 bytes** (NIST SP 800-38D recommends 12 for GCM) — B to update                                      |
| Auth tag length                  | A: 128-bit (Web Crypto default) · B: 16 bytes (128-bit)             | aligned ✅                                                                                                             |
| Key encoding                     | A: base64 · B: hex                                                  | **base64** in canonical (works in both env and code)                                                                   |
| Key derivation                   | A: raw env var · B: raw env var                                     | Add **HKDF** layer in canonical (defense against key reuse)                                                            |
| HMAC signing (C)                 | HMAC-SHA256                                                         | aligned ✅; canonical for cookie integrity                                                                             |
| Google ID-token verification (C) | direct `tokeninfo` endpoint                                         | **switch to JWKS-based local verification** in a follow-up (avoids per-request round-trip to Google) — separate ticket |

---

## Canonical Home Structure (proposed for Phase 2)

```text
packages/shared/src/crypto/
├── index.js                 # barrel — re-exports per-runtime modules
├── node.js                  # Node `crypto` runtime (replaces B)
├── webcrypto.js             # Web Crypto runtime (replaces A)
├── hmac.js                  # HMAC primitives (consumed by C's codegen)
└── __tests__/
    ├── node.test.js
    └── webcrypto.test.js
```

Subpath exports in `packages/shared/package.json`:

```json
{
  "exports": {
    "./crypto/node": "./src/crypto/node.js",
    "./crypto/webcrypto": "./src/crypto/webcrypto.js",
    "./crypto/hmac": "./src/crypto/hmac.js"
  }
}
```

Consumer pattern after migration:

```js
// Node-side (job-server session broker):
import { encrypt, decrypt } from '@resume/shared/crypto/node';

// Worker-side (job-dashboard handlers):
import { encrypt, decrypt } from '@resume/shared/crypto/webcrypto';
```

Both modules expose the **same function names** and the **same envelope format**
(`iv:authTag:ciphertext` base64, 12-byte IV, 16-byte authTag) so a payload
encrypted on the Node side decrypts on the Worker side and vice versa.

---

## Migration Plan

### Phase 1 (this PR) — **complete**

- [x] Inventory every crypto/auth-helper implementation.
- [x] Distinguish runtime-justified divergence from true duplication.
- [x] Decide canonical home: `packages/shared/src/crypto/` with `node` / `webcrypto`
      subpath exports.
- [x] Audit algorithm/IV/key-encoding choices and document the canonical defaults.

### Phase 2 (follow-up PR)

- [ ] Implement `packages/shared/src/crypto/{node,webcrypto}.js` with the
      canonical defaults (AES-256-GCM, 12-byte IV, base64 keys, HKDF layer).
- [ ] Add 90%+ unit-test coverage for both modules including a cross-runtime
      envelope-compat test.
- [ ] Migrate `apps/job-dashboard/src/utils/crypto.js` → re-export from
      `@resume/shared/crypto/webcrypto`.
- [ ] Migrate `apps/job-server/src/session-broker/services/encryption-service.js`
      → wrap `@resume/shared/crypto/node` and keep the `EncryptionService` class
  - `wrap`/`unwrap` TTL semantics (those are domain-specific, not crypto).
- [ ] Schedule the IV-length change (B 16→12) as a key-rotation event:
      bump `SESSION_ENCRYPTION_KEY_VERSION`, decrypt-on-read with both lengths
      during the rollover window.

### Phase 3 (separate ticket)

- [ ] Switch `verifyGoogleToken` to JWKS-based local verification (avoids the
      per-request round-trip to `oauth2.googleapis.com/tokeninfo`).

---

## Verification (this PR)

This PR adds the triage doc only — no code changes. It satisfies the
**first three** acceptance bullets of #42:

> - Document distinguishes which runtime requires which API.
> - Canonical implementations in `packages/shared/src/crypto/` with separate
>   exports for `node` and `webcrypto` (subpath exports).
> - Consistent algorithm choices and key derivation.

The structural decisions (subpath layout, AES-256-GCM / 12-byte IV / base64 /
HKDF defaults) are now binding for Phase 2. The migration code itself remains
on issue #42 until that PR lands.

---

## See Also

- [`docs/architecture/SSOT_IMPROVEMENT_PLAN.md`](./SSOT_IMPROVEMENT_PLAN.md)
  § SSOT-033 — original consolidation entry.
- [`docs/security/wrangler-vars-vs-secrets.md`](../security/wrangler-vars-vs-secrets.md)
  — boundary policy for `ENCRYPTION_KEY` / `SESSION_ENCRYPTION_KEY` storage.
- [`docs/security/SECRET_ROTATION_PLAYBOOK.md`](../security/SECRET_ROTATION_PLAYBOOK.md)
  § Encryption keys — rotation cadence and dual-decrypt windows.
