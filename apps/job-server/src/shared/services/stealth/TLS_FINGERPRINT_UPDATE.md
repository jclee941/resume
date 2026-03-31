# TLS Fingerprint Pool Update Runbook

## Scope

`TLSFingerprintManager` in `tls-fingerprint.js` maintains the JA3 + User-Agent pool used by crawlers.

## Monthly Update Steps

1. Capture current browser fingerprints for:
   - Chrome desktop 120+
   - Firefox desktop 120+
   - Safari desktop 17+
2. Validate each JA3 string format:
   - `TLSVersion,Ciphers,Extensions,SupportedGroups,ECPointFormats`
   - Numeric values separated by `-` within each segment
3. Confirm UA alignment:
   - Browser family/version in UA matches selected JA3 profile family
   - Platform token in UA (`Windows`, `Macintosh`, `Linux`) matches `platform`
4. Replace or append JA3 constants and UA templates in `tls-fingerprint.js`.
5. Keep pool size at 50+ entries.
6. Run tests and typecheck.

## Recommended Data Sources

- `lexiforest/curl-impersonate` signature YAML files
- Fluxzy impersonation profile JSON files
- Live verification endpoint such as `tools.scrapfly.io/api/fp/ja3`

## Verification Checklist

- `TLSFingerprintManager` still returns 50+ fingerprints
- All JA3 values pass format validation
- Platform filtering (`win`, `mac`, `linux`) works
- Proxy-to-fingerprint mapping remains deterministic unless forced rotation
