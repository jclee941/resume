# job-dashboard Production Deploy + Service Binding Re-add

**Status**: ⚠️ **OPEN — requires human action** (chicken-and-egg with portfolio binding)
**Tracked as**: P0-4 in `docs/architecture/MONOREPO_REVIEW_2026-04-29.md`
**Owner**: Repository owner (qws941)
**Estimated time**: 30 minutes

---

## Why this is required

- `apps/portfolio/entry.js:22` calls `env.JOB_SERVICE.fetch(request)` to proxy
  `/job/*` requests to the dashboard worker.
- That binding (`JOB_SERVICE` → worker `job`) cannot be added to
  `apps/portfolio/wrangler.jsonc` until the `job` worker actually exists in
  the same Cloudflare account. Otherwise `wrangler deploy --env production`
  fails with `[code: 10143] Service binding 'JOB_SERVICE' references Worker
  'job' which was not found.`
- Currently `apps/job-dashboard` (worker `job`) has **never been deployed**
  to the Cloudflare account, so `entry.js` always falls through to the 503
  fallback.

We must deploy `job` first, then re-add the `services` binding to portfolio.

---

## Step-by-step

### 1. Verify wrangler.jsonc bindings are present

```bash
cat apps/job-dashboard/wrangler.jsonc | head -120
```

Should contain (verify each):
- `name: "job"`
- D1 database `DB` → `job-dashboard-db`
- KV namespaces: `SESSIONS`, `RATE_LIMIT_KV`, `NONCE_KV`
- Durable Object `BROWSER_SESSION`
- 7 Workflows
- Routes: `resume.jclee.me/job/*`

### 2. Provision required Cloudflare resources

If they don't already exist (one-time setup):

```bash
# D1 database
npx wrangler d1 create job-dashboard-db
# → copy database_id into wrangler.jsonc d1_databases[].database_id

# KV namespaces (if not provisioned)
npx wrangler kv:namespace create SESSIONS
npx wrangler kv:namespace create RATE_LIMIT_KV
npx wrangler kv:namespace create NONCE_KV
# → copy ids into wrangler.jsonc kv_namespaces[].id
```

### 3. Set required Worker secrets

```bash
cd apps/job-dashboard

# REQUIRED — auth + crypto
npx wrangler secret put ADMIN_TOKEN --env production           # bearer for admin endpoints
npx wrangler secret put AUTH_SYNC_SECRET --env production      # for /api/auth/sync
npx wrangler secret put COOKIE_ENCRYPTION_KEY --env production # 32-byte hex; encrypts platform cookies
npx wrangler secret put WEBHOOK_SECRET --env production        # webhook HMAC

# OPTIONAL — notifications
npx wrangler secret put TELEGRAM_BOT_TOKEN --env production
npx wrangler secret put TELEGRAM_CHAT_ID --env production

# Verify
npx wrangler secret list --env production
```

### 4. Apply D1 migrations

```bash
cd apps/job-dashboard

# Apply schema
npx wrangler d1 execute job-dashboard-db \
  --remote \
  --file=migrations/001-initial.sql

# Verify tables
npx wrangler d1 execute job-dashboard-db --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 5. Deploy job-dashboard

```bash
cd apps/job-dashboard
npx wrangler deploy --env production
# OR via root:
# npm run deploy --workspace @resume/job-dashboard-worker
```

Watch for:
- ✅ `Deployed job to https://resume.jclee.me/job/*`
- ❌ Missing-binding errors → resolve in step 2/3 first.

### 6. Smoke-test the deployed worker

```bash
curl https://resume.jclee.me/job/health
# Expect: { "status": "healthy", ... }

curl https://resume.jclee.me/job/api/stats
# Expect: 401 Unauthorized (admin auth required) — proves routing works
```

### 7. Re-add JOB_SERVICE binding to portfolio

Edit `apps/portfolio/wrangler.jsonc`. In the `production` env block, add at the
same level as `kv_namespaces`:

```jsonc
"services": [
  {
    "binding": "JOB_SERVICE",
    "service": "job"
  }
]
```

Remove the comment marker that was added in commit `a626e28` saying
"will be re-added once apps/job-dashboard is deployed".

Commit + push:
```bash
git add apps/portfolio/wrangler.jsonc
git commit -m "feat(portfolio): re-enable JOB_SERVICE binding now that job worker is live

Closes P0-4 in docs/architecture/MONOREPO_REVIEW_2026-04-29.md.
job-dashboard deploy completed per docs/runbooks/JOB_DASHBOARD_DEPLOY.md
so the service binding now resolves at deploy time."
git push origin master
```

### 8. Verify end-to-end

```bash
# After portfolio Release CI completes:
curl -i https://resume.jclee.me/job/health
# Expect: 200 OK with X-Powered-By: cloudflare-workers (proxied via portfolio)

curl https://resume.jclee.me/job/api/applications -H "Authorization: Bearer $ADMIN_TOKEN"
# Expect: JSON response (proves binding works through portfolio entry.js)
```

---

## Verification checklist

- [ ] `npx wrangler deployments list --env production` shows a recent `job` deploy
- [ ] `curl https://resume.jclee.me/job/health` returns 200
- [ ] `apps/portfolio/wrangler.jsonc` has `services: [{ binding: "JOB_SERVICE", service: "job" }]`
- [ ] Portfolio re-deploy succeeded (no `[code: 10143]` error)
- [ ] `curl https://resume.jclee.me/job/api/applications` reaches the dashboard handler (returns 401, not 503 fallback from `entry.js`)

When all 5 checks pass, mark P0-4 RESOLVED in
`docs/architecture/MONOREPO_REVIEW_2026-04-29.md` § 9.

---

## Why this can't be automated from inside the repo

- The Cloudflare account doesn't have a deployed `job` worker yet, and
  creating one requires Cloudflare credentials that aren't in CI scope.
- D1 schema migrations require `--remote` flag against a live database that
  doesn't exist until after manual provisioning.
- Worker secrets (`ADMIN_TOKEN`, `AUTH_SYNC_SECRET`, etc.) can only be set
  by a human with `wrangler login` or an account-scoped token.

This is a one-time bootstrap, not a recurring chore.
