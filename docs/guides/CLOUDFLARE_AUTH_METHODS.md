# Cloudflare auth methods (historical reference)

> **Historical reference (2025-11-12).** The former setup commands and
> machine-specific credential diagnosis have been removed. This page does not
> report current account or credential state.

For present-day secret handling, follow the
[1Password secret guide](ONEPASSWORD_RESUME_SECRETS.md). Production deployment
ownership is documented in the
[deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md).

- **Scoped API token:** Preferred for new Cloudflare deployment workflows.
- **Global API key with account email:** Legacy authentication is still
  supported by some existing content and infrastructure tooling. Keep both
  values in the secret manager; do not copy them into files, logs, or command
  output.
- **Wrangler interactive login:** Available for local interactive use; it does
  not replace the production Workers Builds deployment path.

The credentials and permissions needed depend on the owning command. Do not
assume every Wrangler command accepts the same authentication methods.
