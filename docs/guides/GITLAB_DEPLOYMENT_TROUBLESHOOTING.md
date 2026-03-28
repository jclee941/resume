# GitLab CI/CD OAuth Deployment & Troubleshooting Guide

## 🚀 Deployment Checklist

### Pre-Deployment Requirements

- [ ] GitLab instance accessible at `http://gitlab.jclee.me`
- [ ] GitLab project created for `qws941/resume`
- [ ] GitLab Runner registered with `docker` tag
- [ ] OAuth application created in GitLab
- [ ] Credentials stored in 1Password vault `homelab`

### Quick Start with Automation Scripts

We provide helper scripts for quick setup:

# 1. Set up OAuth application (interactive)
go run ./tools/scripts/setup-gitlab-oauth.go

# 2. Register GitLab Runner
# Get registration token from: http://gitlab.jclee.me/admin/runners
go run ./tools/scripts/deployment/register-gitlab-runner.go YOUR_REGISTRATION_TOKEN

# 3. Verify everything is ready
node tools/scripts/verification/verify-gitlab-cicd.js
go run ./tools/scripts/setup-gitlab-oauth.go

# 2. Register GitLab Runner
# Get registration token from: http://gitlab.jclee.me/admin/runners
go run ./tools/scripts/deployment/register-gitlab-runner.go YOUR_REGISTRATION_TOKEN
# 1. Set up OAuth application (interactive)
./tools/scripts/setup-gitlab-oauth.sh

# 2. Register GitLab Runner
# Get registration token from: http://gitlab.jclee.me/admin/runners
./tools/scripts/deployment/register-gitlab-runner.sh YOUR_REGISTRATION_TOKEN

# 3. Verify everything is ready
node tools/scripts/verification/verify-gitlab-cicd.js
```

---

## 📋 Step-by-Step Deployment

### Step 1: Verify GitLab Runner Status

```bash
# Check if runner is online
docker exec -it gitlab-runner gitlab-runner list

# Verify runner logs
docker logs gitlab-runner -f
```

**Expected Output:**

```
Runtime platform: linux/amd64
Listing configured runners:
  Docker Runner for Resume Portfolio
    Executor: docker
    Token: xxxxxxxxxxxx
    URL: http://gitlab.jclee.me
    Status: online  # ← Must show "online"
```

### Step 2: Configure CI/CD Variables

Go to: `http://gitlab.jclee.me/qws941/resume/-/settings/ci_cd`

Click **Variables** → **Add variable**

| Variable                     | Value                        | Type     | Protected | Masked  |
| ---------------------------- | ---------------------------- | -------- | --------- | ------- |
| `GITLAB_URL`                 | `http://gitlab.jclee.me` | Variable | No        | No      |
| `GITLAB_OAUTH_APP_ID`        | (from 1Password)             | Variable | No        | No      |
| `GITLAB_OAUTH_CLIENT_SECRET` | (from 1Password)             | Variable | Yes       | **Yes** |
| `TELEGRAM_BOT_TOKEN`         | (existing)                   | Variable | No        | **Yes** |
| `TELEGRAM_CHAT_ID`           | (existing)                   | Variable | No        | No      |

### Step 3: Test OAuth Token Fetch

```bash
# Manual test from local machine
curl -X POST "http://gitlab.jclee.me/oauth/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_SECRET" \
  -d "scope=api"
```

**Expected Response:**

```json
{
  "access_token": "glpat-xxxxxxxxxxxx",
  "token_type": "Bearer",
  "expires_in": 7200,
  "scope": "api"
}
```

### Step 4: Push and Trigger Pipeline

```bash
# Commit the .gitlab-ci.yml
git add .gitlab-ci.yml
git commit -m "feat: add GitLab CI/CD with OAuth"
git push origin master

# Or trigger manually via GitLab UI
# http://gitlab.jclee.me/qws941/resume/-/pipelines/new
```

---

## 🔧 Troubleshooting Common Issues

### Issue 1: Pipeline Stuck in "Pending"

**Symptoms:**

- Jobs show "pending" or "stuck"
- No runner activity in logs

**Causes & Solutions:**

| Cause                | Solution                                                 |
| -------------------- | -------------------------------------------------------- |
| No runner registered | Register runner: `gitlab-runner register`                |
| Runner offline       | Restart runner: `docker restart gitlab-runner`           |
| Tag mismatch         | Ensure runner has `docker` tag matching `.gitlab-ci.yml` |
| Runner paused        | Unpause in GitLab UI: Settings → CI/CD → Runners         |

**Verification:**

```bash
# Check runner status
docker exec gitlab-runner gitlab-runner verify

# List all runners
docker exec gitlab-runner gitlab-runner list
```

### Issue 2: OAuth Token Fetch Fails

**Symptoms:**

- `fetch-oauth-token` job fails
- Error: "Failed to obtain OAuth token"

**Causes & Solutions:**

```bash
# Check if credentials are set
echo $GITLAB_OAUTH_APP_ID
echo $GITLAB_OAUTH_CLIENT_SECRET

# Test OAuth endpoint manually
curl -v -X POST "http://gitlab.jclee.me/oauth/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_SECRET"
```

| Error                    | Cause                    | Solution                          |
| ------------------------ | ------------------------ | --------------------------------- |
| `invalid_client`         | Wrong App ID or Secret   | Verify credentials from GitLab UI |
| `unsupported_grant_type` | Grant type not supported | Check GitLab OAuth settings       |
| `invalid_scope`          | Scope not allowed        | Use `api` scope only              |
| Connection refused       | GitLab not accessible    | Check network/firewall            |

### Issue 3: Docker Permission Errors

**Symptoms:**

```
Cannot connect to the Docker daemon
permission denied while trying to connect to Docker daemon
```

**Solutions:**

```bash
# Option 1: Add runner to docker group
sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner

# Option 2: Use privileged mode (less secure)
# Edit /srv/gitlab-runner/config/config.toml
[runners.docker]
  privileged = true
```

### Issue 4: Network Connectivity Issues

**Symptoms:**

- Cannot reach external URLs
- npm install fails
- curl timeouts

**Diagnosis:**

```bash
# Test from runner container
docker exec -it gitlab-runner sh
ping 8.8.8.8
ping registry.npmjs.org
curl -I https://registry.npmjs.org
```

**Solutions:**

- Check DNS configuration
- Verify firewall rules
- Use proxy if behind corporate firewall:

```yaml
variables:
  HTTP_PROXY: 'http://proxy.company.com:8080'
  HTTPS_PROXY: 'http://proxy.company.com:8080'
```

### Issue 5: Build Failures

**Symptoms:**

- `npm ci` fails
- `npm run build` fails

**Diagnosis:**

```bash
# Run locally to verify
npm ci
npm run typecheck
npm run build --prefix apps/portfolio
```

**Common Causes:**

- Missing `package-lock.json` → Run `npm install` locally and commit
- Node version mismatch → Ensure using Node 22
- Missing dependencies → Check `package.json`

### Issue 6: Notification Failures

**Symptoms:**

- Telegram notifications not sent
- No error in pipeline

**Diagnosis:**

```bash
# Test Telegram API manually
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": \"Test message\"}"
```

**Solutions:**

- Verify bot token is valid
- Ensure bot is added to chat
- Check chat ID is correct

---

## 📊 Verification Commands

### Pipeline Health Check

```bash
# View pipeline status
curl -s "http://gitlab.jclee.me/api/v4/projects/PROJECT_ID/pipelines" \
  -H "PRIVATE-TOKEN: YOUR_TOKEN" | jq '.[0].status'
```

### Runner Health Check

```bash
# Docker-based runner
docker ps | grep gitlab-runner
docker logs gitlab-runner --tail 50

# Binary runner
sudo systemctl status gitlab-runner
sudo journalctl -u gitlab-runner -f
```

### OAuth Health Check

```bash
# Test token endpoint
curl -s -X POST "http://gitlab.jclee.me/oauth/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=${GITLAB_OAUTH_APP_ID}" \
  -d "client_secret=${GITLAB_OAUTH_CLIENT_SECRET}" \
  -d "scope=api" | jq -r '.access_token'
```

---

## 🆘 Emergency Procedures

### Pipeline Stuck

```bash
# Cancel stuck pipeline via API
curl -X POST "http://gitlab.jclee.me/api/v4/projects/PROJECT_ID/pipelines/PIPELINE_ID/cancel" \
  -H "PRIVATE-TOKEN: YOUR_TOKEN"
```

### Runner Not Responding

```bash
# Restart runner
docker restart gitlab-runner

# Or recreate
docker stop gitlab-runner
docker rm gitlab-runner
docker run -d --name gitlab-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /srv/gitlab-runner/config:/etc/gitlab-runner \
  gitlab/gitlab-runner:latest
```

### Rollback CI/CD Changes

```bash
# Revert to previous working state
git revert HEAD --no-edit
git push origin master
```

---

## 📞 Support Resources

| Resource          | URL                                                       |
| ----------------- | --------------------------------------------------------- |
| GitLab Instance   | http://gitlab.jclee.me                                |
| Project Pipelines | http://192.168.                                                                                                                                                                                                                                                                                     