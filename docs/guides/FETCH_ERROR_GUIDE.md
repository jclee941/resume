# Cloudflare Authentication Errors: Historical Note

**Historical snapshot**: 2025-12-19

> This note records an earlier local authentication setup. It does not establish
> that the same error exists now. For current credentials, follow the
> [secret policy](../security/wrangler-vars-vs-secrets.md) and
> [1Password tooling guide](../../tools/scripts/onepassword/AGENTS.md). Production
> deployment is owned by the [deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md).

The original troubleshooting steps depended on local `.env` files and direct
deployment commands. Those steps are retired; do not print credentials or use this
page to change local credential files.

Some current tooling still supports legacy API-key/email authentication. This note
does not define that contract; follow the owning tool's current instructions.
