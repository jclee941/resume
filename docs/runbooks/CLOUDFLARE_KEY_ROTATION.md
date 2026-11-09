# Cloudflare API Key Rotation — Historical Runbook

> **Historical procedure, status unverified.** This runbook was written for a
> GitHub release workflow that is no longer present. Production deployment now
> uses the repository-root Wrangler configuration and Workers Builds. The
> current external credential type, rotation state, and deployment integration
> have not been verified here.

## Current operator status

Track unresolved credential work in the
[pending operator actions](./PENDING_OPERATOR_ACTIONS.md) checklist. Apply the
[secret boundary policy](../security/wrangler-vars-vs-secrets.md) and verify
the active deployment process in
[`docs/architecture/DEPLOYMENT_PIPELINE.md`](../architecture/DEPLOYMENT_PIPELINE.md).

The former step-by-step instructions and release-workflow examples have been
removed because their workflow and environment assumptions are obsolete. This
documentation edit does not rotate or revoke a credential, verify a production
deployment, or establish external account state.
