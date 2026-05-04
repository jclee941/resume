# Cloudflare API Key Rotation Runbook

**Status**: ⚠️ **OPEN — requires human action**
**Tracked as**: P0-1 in `docs/architecture/MONOREPO_REVIEW_2026-04-29.md`
**Owner**: Repository owner (qws941)
**Estimated time**: 15 minutes

---

## Why this is required

Production deploys use the Cloudflare **Global API Key** (`CLOUDFLARE_API_KEY`
GitHub
secret + `CLOUDFLARE_EMAIL`). Per Oracle security review:

> A leaked global API key is account-wide blast radius.

The fix is to:

1. Mint a **scoped API Token** with only `Workers Scripts:Edit` (and `Cache
   Purge` if used).
2. Add it as a new `CLOUDFLARE_API_TOKEN` GitHub secret.
3. Update `.github/workflows/release.yml` to use the token instead of the global
   key.
4. Verify a deploy works.
5. Revoke the old global API key.

This MUST be done by someone with admin access to the Cloudflare account
and the GitHub repository — it cannot be automated from inside the repo.

---

## Step-by-step

### 1. Mint a scoped token in Cloudflare

1. Open <https://dash.cloudflare.com/profile/api-tokens>
2. Click **Create Token**
3. Use template **"Edit Cloudflare Workers"** (or **Custom token** with):
   - **Permissions**:
     - `Account → Workers Scripts → Edit`
     - `Account → Workers Routes → Edit`
     - `Zone → Workers Routes → Edit` (resource: `jclee.me`)
     - `Zone → Cache Purge → Purge` (optional, only if release pipeline purges)
   - **Account Resources**: include only the account that hosts `resume` and
     `job` workers
   - **Zone Resources**: include only `jclee.me`
   - **TTL**: optional but recommended 1 year max
4. Click **Continue to summary** → **Create Token**
5. **Copy the token immediately** — Cloudflare will not show it again.

### 2. Add the token to GitHub secrets

```bash
# Using gh CLI (interactive)
gh secret set CLOUDFLARE_API_TOKEN --repo jclee941/resume
# paste the token when prompted

# OR via web UI:
# https://github.com/jclee941/resume/settings/secrets/actions
#   → New repository secret
#   → Name: CLOUDFLARE_API_TOKEN
#   → Value: <paste token>
```

### 3. Update `.github/workflows/release.yml`

Replace the `env:` block of the deploy step with the token-only flow:

```yaml
- name: Deploy to Cloudflare Workers (production)
  if: steps.bump.outputs.should_release == 'true' && github.event.inputs.dry_run != 'true'
  uses: cloudflare/wrangler-action@v3
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  with:
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    workingDirectory: apps/portfolio
    command: deploy --env production
```

Removed: `CLOUDFLARE_EMAIL`, `CLOUDFLARE_API_KEY` env entries.
The `wrangler-action` auto-detects `CLOUDFLARE_API_TOKEN` and prefers it
over global key auth.

Commit message:

```text
chore(deploy): migrate Cloudflare auth from global API key to scoped token

Closes P0-1 in docs/architecture/MONOREPO_REVIEW_2026-04-29.md.
- Drops CLOUDFLARE_EMAIL + CLOUDFLARE_API_KEY env vars from release.yml
- wrangler-action auto-uses CLOUDFLARE_API_TOKEN
- Token has minimum scopes: Workers Scripts Edit + Workers Routes Edit
```

### 4. Verify the new deploy

After pushing the workflow change to `master`:

```bash
# Watch the next Release run
gh run watch --branch master --workflow Release

# After it completes, verify production
curl -s https://resume.jclee.me/health | jq .
# Expect: { "status": "healthy", "version": "<new>", ... }
```

### 5. Revoke the old global API key

1. Open <https://dash.cloudflare.com/profile/api-tokens>
2. Scroll to **Global API Key** section → click **View**
3. Click **Roll** (this regenerates the key, invalidating the old one)
   OR
   If you also want to remove `CLOUDFLARE_EMAIL` + `CLOUDFLARE_API_KEY` GitHub
   secrets that are now unused:

   ```bash
   gh secret delete CLOUDFLARE_API_KEY --repo jclee941/resume
   gh secret delete CLOUDFLARE_EMAIL --repo jclee941/resume
   ```

---

## Verification checklist

- [ ] New `CLOUDFLARE_API_TOKEN` GitHub secret exists
- [ ] `.github/workflows/release.yml` uses `CLOUDFLARE_API_TOKEN` env var only
  (no `CLOUDFLARE_API_KEY`/`CLOUDFLARE_EMAIL`)
- [ ] At least one production deploy via the new token completed successfully
- [ ] `curl https://resume.jclee.me/health` returns `status: healthy` after
  deploy
- [ ] Old global API key rolled OR `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL`
  secrets deleted from GitHub

When all 5 checks pass, mark P0-1 RESOLVED in
`docs/architecture/MONOREPO_REVIEW_2026-04-29.md` § 9.

---

## Why this can't be automated from inside the repo

- Cloudflare API tokens can only be created by a human signed into the
  Cloudflare dashboard.
- GitHub repository secrets cannot be set by a workflow that doesn't already
  have admin access.
- Even if both were possible programmatically, the credentials needed to
  bootstrap that automation would themselves be the same blast-radius global key
  we're trying to retire.

This is a one-time human handoff, not a recurring chore.
