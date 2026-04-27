# Secret Rotation Playbook — Epic 0 Execution Log

**Generated:** 2026-04-27 (during SSOT-001 through SSOT-005 execution)
**Backup location:** `/tmp/resume-backup-20260427-133607/` (host-local)
**Backup tag:** `backup/pre-secret-rewrite-20260427-133607` (git tag + branch)

---

## What was executed automatically

Working-tree sanitization complete. The following changes are staged for commit:

- `.env.automation` — replaced plaintext credentials with placeholder template (now gitignored).
- `.env.automation.example` — new template file to bootstrap from.
- `apps/job-dashboard/.env.secrets` — replaced compromised values with **freshly rotated** ADMIN_TOKEN / WEBHOOK_SECRET / ENCRYPTION_KEY (now gitignored, mode 600).
- `apps/job-dashboard/.env.secrets.example` — new template file.
- `apps/portfolio/.tmp/` — entire directory untracked (build artifact, contained Cloudflare beacon token).
- `tools/automation/resume-automation.js` — JSDoc comment with plaintext password redacted.
- `docs/guides/CLOUDFLARE_AUTH_METHODS.md` — real CF API key replaced with `REVOKED_CF_API_KEY_REPLACE_ME`.
- `docs/guides/CLOUDFLARE_TOKEN_SETUP.md` — same.
- `docs/guides/DEPLOYMENT_VISUAL_GUIDE.md` — same (6 occurrences).
- `.gitignore` — strengthened with comprehensive secret-file patterns.
- `.gitleaks.toml` — extended with project-specific rules (Wanted OneID, JobKorea session, ADMIN_TOKEN/WEBHOOK_SECRET/ENCRYPTION_KEY patterns) and proper allowlists.
- `.pre-commit-config.yaml` — new file with gitleaks pre-commit hook.
- `.github/workflows/ci.yml` — added `secret-scan` job using gitleaks-action.
- `docs/architecture/kv-ownership.md` — new file documenting KV namespace ownership contract (SSOT-005).

---

## What you MUST do manually (THE OWNER)

### Step 1 — Rotate JobKorea and Wanted credentials NOW

The plaintext password `bingogo1l7` was committed to:
- `.env.automation` (TRACKED, in commit `c40d7d1`)
- `tools/automation/resume-automation.js` JSDoc (TRACKED)

These are accessible via GitHub history at `https://github.com/jclee941/resume`. Anyone who cloned the repo before history rewrite has them.

**Required actions:**

1. Log in to JobKorea (`https://www.jobkorea.co.kr`) → change password → store new password in 1Password.
2. Log in to Wanted (`https://wanted.co.kr`) → change password → store new password in 1Password.
3. Revoke any active OAuth tokens issued via the old passwords.

### Step 2 — Revoke / rotate the leaked Cloudflare API keys

The following keys were committed and may be in github.com history (Initial commit `31fbb4c`):

| Key prefix | Where it appeared | Action |
|------------|-------------------|--------|
| `00ceb252a1a463c9c69a9f5a9f97e5d112bb9` | `docs/guides/CLOUDFLARE_*.md` | Revoke at Cloudflare dashboard → My Profile → API Tokens |
| `f79df8b585816744df8093b18b23f6a50b8cd` | `.env.local`, `DEPLOYMENT_*.md` | Revoke |
| `CMTfxOdHacsbXsegngbbAV-jW5tPwsHA7HTtYswb` | `docs/reports/CICD_DEBUG*.md`, `DEPLOYMENT_STATUS.md` | Revoke |
| `8c92c40a4f374cde9c3b7f8a1e9b5c2d` | `typescript/portfolio-worker/index*.html` (legacy) | Revoke |

Cloudflare console: https://dash.cloudflare.com/profile/api-tokens

### Step 3 — Revoke / rotate the leaked third-party tokens

These appeared in `docs/reports/ALL_SYSTEMS_REPORT.md` and elsewhere:

| Token | Service | Action |
|-------|---------|--------|
| `morph_***[REDACTED-PURGED]***` | Morph (LLM) | Revoke at Morph dashboard |
| `sk-or-v1-***[REDACTED-PURGED]***` | OpenRouter | Revoke at https://openrouter.ai/keys |
| `glpat-dYEw***[REDACTED]***` | GitLab Personal Access Token (full value in /tmp/git-filter-replacements.txt) | Revoke at GitLab → User Settings → Access Tokens |
| `glsa_39K1QJ***[REDACTED]***` | Grafana service account (full value in /tmp/git-filter-replacements.txt) | Revoke at Grafana → Service accounts |
| `xapp-1-A09TER0TF5Y-10022641763313-...` | Slack app token | Revoke at https://api.slack.com/apps → OAuth & Permissions |

### Step 4 — Upload the freshly rotated job-dashboard secrets to 1Password

The new values are in `/tmp/resume-new-secrets.env` (mode 600). Run:

```bash
source /tmp/resume-new-secrets.env

op item create \
  --category=password \
  --title='resume/job-dashboard ADMIN_TOKEN' \
  --vault=Private \
  password="$NEW_ADMIN_TOKEN" \
  notesPlain='Rotated 2026-04-27 during Epic 0 execution. Previous value was tracked in git history.'

op item create \
  --category=password \
  --title='resume/job-dashboard WEBHOOK_SECRET' \
  --vault=Private \
  password="$NEW_WEBHOOK_SECRET" \
  notesPlain='Rotated 2026-04-27.'

op item create \
  --category=password \
  --title='resume/job-dashboard ENCRYPTION_KEY' \
  --vault=Private \
  password="$NEW_ENCRYPTION_KEY" \
  notesPlain='Rotated 2026-04-27. AES-GCM 32-byte key (base64).'

# Verify
op item list --vault=Private | grep 'resume/'

# After successful upload, remove the local plaintext file:
shred -u /tmp/resume-new-secrets.env
```

### Step 5 — Push the rotated secrets to Cloudflare Workers

```bash
cd apps/job-dashboard

wrangler secret put ADMIN_TOKEN --config wrangler.jsonc
# (paste value from 1Password when prompted)

wrangler secret put WEBHOOK_SECRET --config wrangler.jsonc

wrangler secret put ENCRYPTION_KEY --config wrangler.jsonc

# Verify
wrangler secret list --config wrangler.jsonc
```

For staging or other environments, repeat with `--env staging` etc.

### Step 6 — Rewrite git history to purge the leaked secrets

**THIS IS DESTRUCTIVE. Coordinate with all collaborators first. After this, anyone with a local clone must reset.**

```bash
# 1. Verify backups exist
ls -la /tmp/resume-backup-20260427-133607/
git tag | grep backup/pre-secret-rewrite

# 2. Run git-filter-repo to scrub history
cd /home/jclee/dev/resume
git-filter-repo --replace-text /tmp/git-filter-replacements.txt --force

# 3. Verify history is clean
gitleaks detect --source . --config .gitleaks.toml --redact

# 4. Re-add remotes (filter-repo strips them as a safety measure)
git remote add origin https://github.com/jclee941/resume.git
git remote add gitlab http://192.168.50.215:8929/root/resume.git

# 5. Force push (DESTRUCTIVE)
git push --force-with-lease origin master
git push --force-with-lease --tags origin
git push --force-with-lease gitlab master

# 6. Notify all collaborators to re-clone
echo "Notify team: 'git history was rewritten on $(date -u). Delete your local clone and re-clone from origin.'"
```

### Step 7 — Verify the cleanup landed

```bash
# Pull the rewritten history
cd /tmp && git clone https://github.com/jclee941/resume.git verify-clean
cd verify-clean
gitleaks detect --source . --config .gitleaks.toml --redact

# Expected: only working-tree leaks (your local .env files), no committed leaks
# All historic commits should now show 'REDACTED-SECRET-PURGED' instead of values
git log --all --oneline -S "00ceb252a1a463c9c69a9f5a9f97e5d112bb9"
# Expected: empty output
```

### Step 8 — Enable pre-commit hook locally

```bash
# Install pre-commit if not already
pip install --user pre-commit
# Or: brew install pre-commit

# Install hooks
cd /home/jclee/dev/resume
pre-commit install

# Test
pre-commit run --all-files
```

### Step 9 — Set up 1Password CLI integration for daily use

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Source resume automation env vars from 1Password (call before running automation)
resume-env() {
  export RESUME_JOBKOREA_USER=$(op read 'op://Private/JobKorea/username')
  export RESUME_JOBKOREA_PASS=$(op read 'op://Private/JobKorea/password')
  export RESUME_WANTED_EMAIL=$(op read 'op://Private/Wanted/email')
  export RESUME_WANTED_PASS=$(op read 'op://Private/Wanted/password')
  export ADMIN_TOKEN=$(op read 'op://Private/resume/job-dashboard ADMIN_TOKEN/password')
  export WEBHOOK_SECRET=$(op read 'op://Private/resume/job-dashboard WEBHOOK_SECRET/password')
  export ENCRYPTION_KEY=$(op read 'op://Private/resume/job-dashboard ENCRYPTION_KEY/password')
  echo "✅ Resume env loaded from 1Password"
}
```

Usage: `resume-env && npm run automate:full`

---

## Rollback procedure (if filter-repo or push fails)

```bash
# Restore from backup branch / tag
cd /home/jclee/dev/resume
git reset --hard backup/pre-secret-rewrite-20260427-133607

# OR restore from bundle (if branch lost)
cd /tmp
git clone /tmp/resume-backup-20260427-133607/resume-full-history.bundle resume-restored

# Restore secret files (their original values)
cp /tmp/resume-backup-20260427-133607/.env.automation.backup .env.automation
cp /tmp/resume-backup-20260427-133607/job-dashboard-.env.secrets.backup apps/job-dashboard/.env.secrets
```

---

## Verification checklist

- [ ] JobKorea password rotated
- [ ] Wanted password rotated + OAuth revoked
- [ ] All 4 leaked Cloudflare API keys revoked
- [ ] Morph, OpenRouter, GitLab PAT, Grafana SA, Slack app token revoked
- [ ] New ADMIN_TOKEN/WEBHOOK_SECRET/ENCRYPTION_KEY uploaded to 1Password
- [ ] Cloudflare Workers secrets updated via `wrangler secret put`
- [ ] `/tmp/resume-new-secrets.env` shredded after upload
- [ ] Git history rewritten via `git-filter-repo`
- [ ] Force-pushed to origin (GitHub) and gitlab
- [ ] Team notified to re-clone
- [ ] `gitleaks detect` on fresh clone shows no committed leaks
- [ ] `pre-commit install` run locally
- [ ] CI `secret-scan` job passes on next push

---

## Out-of-scope (future tasks per SSOT_IMPROVEMENT_PLAN.md)

- **SSOT-028**: Adopt full secrets manager (Doppler / Keyflare / Infisical) instead of 1Password ad-hoc commands.
- **SSOT-029**: t3-env for type-safe env access.
- **SSOT-031**: CI gate that validates required env vars match secrets manager.

These build on Epic 0 but are not part of the immediate security cleanup.
