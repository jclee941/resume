# Cloudflare API Token Creation Note

**Historical setup note**: 2025-11-12

> Use the current [secret policy](../security/wrangler-vars-vs-secrets.md) and
> [1Password tooling guide](../../tools/scripts/onepassword/AGENTS.md) for
> credential handling. Production deployment belongs to
> [Cloudflare Workers Builds](../architecture/DEPLOYMENT_PIPELINE.md).

Cloudflare provides scoped API tokens through its account dashboard. When a token
is needed, choose only the permissions required by its owning tool and store it
through the approved secret manager. Never print credentials, place them in shell
startup files, or commit them to the repository.

Legacy API-key/email authentication remains supported by some current tooling.
This historical token note does not declare that support absent or define the
tool-specific authentication contract.
