# GitHub Actions Deployment Guide

**Status**: Workflows committed to master branch ✅
**Last Updated**: 2025-02-01
**Next Step**: Configure GitHub Secrets and Trigger First Deployment

---

## 📋 Current Status

### ✅ Completed

- All 4 GitHub Actions workflows created and validated
- Workflows committed to `master` branch (commit: `e08ffb5a`)
- All YAML syntax validated
- All secrets documented and cataloged
- Local `act` testing tool installed

### ⏳ Next Steps (Manual - Requires GitHub Web UI)

1. Verify workflows are visible on GitHub repository
2. Configure GitHub repository secrets
3. Trigger first deployment test
4. Verify services are live

### ❌ Not Yet Done

- GitHub repository secrets configuration (manual UI step)
- First GitHub Actions workflow execution
- Deployment verification

---

## 🔧 Quick Setup Checklist

- [ ] **Step 1**: Go to GitHub repository: https://github.com/qws941/resume
- [ ] **Step 2**: Navigate to Settings → Secrets and variables → Actions
- [ ] **Step 3**: Add CRITICAL secrets (see below)
- [ ] **Step 4**: Trigger CI/CD workflow manually
- [ ] **Step 5**: Monitor execution and verify deployment
- [ ] **Step 6**: Test service endpoints

---

## 🔐 Required GitHub Secrets Configuration

### CRITICAL SECRETS (Required for Deployment)

#### 1. `CLOUDFLARE_API_TOKEN`

**Purpose**: Authentication for Cloudflare API operations
**How to get**:

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template: "Edit Cloudflare Workers"
4. Permissions needed:
   - Account > Cloudflare Workers KV > Edit
   - Account > Cloudflare Workers Scripts > Edit
   - Zone > Workers KV > Edit
5. Copy the token value

**Validation**:

```bash
# After adding secret, you can validate it with:
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID
# Should return: {"success": true, ...}
```

#### 2. `CLOUDFLARE_ACCOUNT_ID`

**Purpose**: Identifies your Cloudflare account
**How to get**:

1. Go to https://dash.cloudflare.com/
2. Click on any domain or account
3. URL will show: `https://dash.cloudflare.com/[ACCOUNT_ID]/`
4. Copy the ACCOUNT_ID value

**Alternative**:

```bash
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts \
  | grep -o '"id":"[^"]*"' | head -1
```

---

## 📦 Workflow Files Location

All workflows are in: `.github/workflows/`

### 1. **ci.yml** (545 lines)

**Purpose**: Main CI/CD pipeline
**Triggers**:

- On push to `master` or `develop` branches
- On pull requests to `master`
- Manual workflow dispatch

**Jobs** (in order):

1. `analyze` - Detect affected targets
2. `lint` - ESLint validation
3. `typecheck` - TypeScript compilation
4. `test-unit` - Jest unit tests
5. `test-e2e` - Playwright browser tests
6. `security-scan` - gitleaks secret scanning
7. `security-audit` - npm audit
8. `build-portfolio` - Build portfolio worker
9. `build-job-dashboard` - Build job dashboard worker
10. `deploy-portfolio` - Deploy to resume.jclee.me
11. `deploy-job-dashboard` - Deploy to resume.jclee.me/job
12. `verify-deployment` - Run health checks
13. `notify` - Send notifications

**Success Criteria**: All jobs pass (or are skipped based on changes)

### 2. **maintenance.yml** (343 lines)

**Purpose**: Scheduled maintenance tasks
**Triggers**: Scheduled trigger + manual dispatch

**Jobs**:

1. `auth-refresh` - Every 6 hours
2. `profile-sync` - Daily at 00:00 UTC
3. `drift-detection` - Weekly on Sundays at 02:00 UTC

### 3. **terraform.yml** (301 lines)

**Purpose**: Infrastructure as Code management
**Triggers**: Manual dispatch only (workflow_dispatch)

**Jobs**:

1. `plan` - Preview infrastructure changes
2. `apply` - Apply infrastructure changes
3. `destroy` - Tear down infrastructure

### 4. **verify.yml** (636 lines)

**Purpose**: Deployment verification
**Triggers**: Manual dispatch + called from ci.yml

**Checks**:

- Service health endpoints
- Worker deployment status
- API functionality
- Database connectivity
- KV namespace status

---

## 🚀 First Deployment: Step-by-Step Guide

### Phase 1: Verify Workflows on GitHub (5 minutes)

1. **Go to your GitHub repository**:

   ```
   https://github.com/qws941/resume
   ```

2. **Check if workflows are visible**:
   - Click on "Actions" tab
   - You should see: "CI/CD Pipeline", "Maintenance", "Terraform", "Verify Deployment"

3. **If workflows are NOT visible**:
   - Go to repository Settings → Code and automation → Actions
   - Ensure "Actions permissions" allows workflows

### Phase 2: Configure GitHub Secrets (15 minutes)

1. **Navigate to Secrets Settings**:

   ```
   https://github.com/qws941/resume/settings/secrets/actions
   ```

2. **Add CLOUDFLARE_API_TOKEN**:
   - Click "New repository secret"
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: [Your Cloudflare API token from step above]
   - Click "Add secret"

3. **Add CLOUDFLARE_ACCOUNT_ID**:
   - Click "New repository secret"
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: [Your Cloudflare Account ID]
   - Click "Add secret"

4. **Verify secrets are added**:
   - You should see 2 secrets listed (values masked)

### Phase 3: Trigger First Deployment (2 minutes)

1. **Go to Actions tab**:

   ```
   https://github.com/qws941/resume/actions
   ```

2. **Select "CI/CD Pipeline" workflow**

3. **Click "Run workflow" dropdown**

4. **Configure inputs** (optional):
   - Branch: select `master`
   - Deploy target: leave as `all`
   - Skip tests: leave as `false`

5. **Click "Run workflow"**

6. **Monitor execution**:
   - Watch the workflow run in real-time
   - Check each job status
   - Estimated duration: 3-5 minutes

### Phase 4: Verify Deployment Success (5 minutes)

**Check Portfolio Service**:

```bash
curl -I https://resume.jclee.me
# Expected: HTTP/1.1 200 OK

curl https://resume.jclee.me/health
# Expected: {"status": "ok", "version": "..."}
```

**Check Job Dashboard Service**:

```bash
curl -I https://resume.jclee.me/job
# Expected: HTTP/1.1 200 OK

curl https://resume.jclee.me/job/health
# Expected: {"status": "ok", "version": "..."}
```

---

## 📊 Workflow Status Dashboard

### How to Monitor Workflows

1. **GitHub Actions Tab**:

   ```
   https://github.com/qws941/resume/actions
   ```

   Shows all workflow runs with status indicators

2. **Specific Workflow Run**:
   - Click on any workflow run
   - See job timeline
   - Click on individual jobs for logs

3. **Real-time Notifications**:
   - GitHub will notify you on failure
   - Configure notifications in account settings

### Interpreting Status Indicators

- 🟢 **Green checkmark**: Job passed
- 🔴 **Red X**: Job failed
- 🟡 **Yellow dot**: Job running
- ⚪ **Gray dot**: Job skipped
- ⏭️ **Double arrow**: Job waiting for dependencies

---

## 🔍 Troubleshooting Common Issues

### Issue 1: Workflows Not Visible in GitHub Actions Tab

**Symptoms**: Actions tab is empty or shows "No workflows found"

**Solution**:

1. Go to Settings → General
2. Ensure "Actions" is enabled under "Features"
3. Verify `.github/workflows/` directory exists and has `.yml` files
4. Commit and push `.github/workflows/` to master branch

### Issue 2: Deployment Job Fails with Secret Error

**Symptoms**: "Error: CLOUDFLARE_API_TOKEN is not defined"

**Solution**:

1. Go to Settings → Secrets and variables → Actions
2. Verify both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are listed
3. If missing, add them following "Phase 2" above
4. Retry the workflow

### Issue 3: Deployment Succeeds But Services Not Responding

**Symptoms**:

```bash
curl https://resume.jclee.me
# Returns: Connection refused or timeout
```

**Solution**:

1. Check GitHub Actions logs for actual error messages
2. Verify Cloudflare account is active
3. Check Cloudflare Workers are deployed:
   ```
   https://dash.cloudflare.com/account/workers/overview
   ```
4. Check KV namespace is accessible
5. Verify DNS records point to Workers

### Issue 4: Jobs Taking Too Long or Timing Out

**Symptoms**: Workflow takes >10 minutes or shows timeout error

**Solution**:

1. Check GitHub status page: https://www.githubstatus.com/
2. Reduce test scope (skip e2e tests temporarily)
3. Check for network connectivity issues
4. Verify Docker image is properly cached

### Issue 5: "Permission Denied" in Deploy Jobs

**Symptoms**: Deploy jobs fail with "Permission denied" or "Unauthorized"

**Solution**:

1. Verify Cloudflare API token has correct permissions:
   - Should include: Workers KV Edit, Workers Scripts Edit
2. Verify Account ID matches the token's account
3. Get new API token with proper permissions from:
   https://dash.cloudflare.com/profile/api-tokens

---

## 📝 Configuration Reference

### Environment Variables (Built-in)

These are automatically available in all jobs:

| Variable        | Value         | Usage                            |
| --------------- | ------------- | -------------------------------- |
| `GITHUB_TOKEN`  | Auto-provided | Git operations, artifact uploads |
| `GITHUB_REF`    | Branch name   | Conditional job execution        |
| `GITHUB_SHA`    | Commit hash   | Build versioning                 |
| `GITHUB_RUN_ID` | Run number    | Build artifact naming            |

### Configuration Files

- **Node.js**: `package.json` + `.npmrc`
- **TypeScript**: `tsconfig.json`
- **ESLint**: `.eslintrc.json`
- **Jest**: `jest.config.ts`
- **Playwright**: `playwright.config.ts`
- **Docker**: Implicit via GitHub-hosted runners

### Cache Configuration

Workflows use caching for:

- npm dependencies (`node_modules/`)
- Build artifacts
- Test results
- TypeScript build cache

---

## 🔗 Useful Links

| Resource                         | URL                                                       |
| -------------------------------- | --------------------------------------------------------- |
| **GitHub Repository**            | https://github.com/qws941/resume                          |
| **GitHub Actions Documentation** | https://docs.github.com/en/actions                        |
| **GitHub Secrets Settings**      | https://github.com/qws941/resume/settings/secrets/actions |
| **GitHub Actions Logs**          | https://github.com/qws941/resume/actions                  |
| **Cloudflare API Tokens**        | https://dash.cloudflare.com/profile/api-tokens            |
| **Cloudflare Dashboard**         | https://dash.cloudflare.com                               |
| **Cloudflare Workers**           | https://dash.cloudflare.com/account/workers/overview      |
| **Portfolio Service**            | https://resume.jclee.me                                   |
| **Job Dashboard Service**        | https://resume.jclee.me/job                               |

---

## ✅ Deployment Verification Checklist

After triggering first deployment, verify:

- [ ] All workflow jobs completed successfully (green checkmarks)
- [ ] No job failures or errors in logs
- [ ] Portfolio service responds at https://resume.jclee.me
- [ ] Portfolio health endpoint returns 200: `curl https://resume.jclee.me/health`
- [ ] Job Dashboard service responds at https://resume.jclee.me/job
- [ ] Job Dashboard health endpoint returns 200: `curl https://resume.jclee.me/job/health`
- [ ] Both services show correct version numbers
- [ ] Recent git commits appear in GitHub
- [ ] Cloudflare Workers dashboard shows latest deployments
- [ ] No error messages in browser console when visiting services

---

## 📚 Additional Documentation

For more details, see:

- `docs/GITHUB_ACTIONS_SECRETS.md` - Detailed secrets configuration
- `.github/workflows/deploy.yml` - Original GitHub Actions configuration (for reference)
- `.github/workflows/` - All workflow definitions

---

**Last Updated**: 2025-02-01
**Status**: Ready for first deployment
**Estimated Time to Completion**: 30 minutes (if secrets already obtained)
