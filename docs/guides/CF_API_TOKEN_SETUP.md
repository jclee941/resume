# Cloudflare credential setup (historical)

> **Historical operator note.** This page records an older local setup and
> credential diagnosis. Do not use its former plaintext-file, secret-copying,
> or manual-deployment steps as current procedure.

For current credential handling, use the
[1Password secret guide](ONEPASSWORD_RESUME_SECRETS.md). For production
deployment ownership, see the
[current deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md).

Cloudflare API tokens are preferred for new deployment workflows. The legacy
`CLOUDFLARE_API_KEY` and `CLOUDFLARE_EMAIL` pair remains supported by existing
integrations; this historical guide does not establish the state of any
credential or account.
