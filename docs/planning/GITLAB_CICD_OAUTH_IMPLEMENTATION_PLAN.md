# GitLab CI/CD OAuth Credential Automation - Implementation Plan

**Document Type:** Implementation Plan  
**Date:** 2026-03-28  
**Status:** Draft  
**Version:** 1.0

---

## 1. Scope Clarification

### 1.1 Interpretation (Chosen)

**Primary Interpretation: Create GitLab CI/CD pipelines that use OAuth for GitLab API automation**

Rationale:
- Self-hosted GitLab at `gitlab.jclee.me` exists but has no automation
- Existing `GITLAB_TOKEN` in `.env.example` suggests GitLab integration was planned
- OAuth patterns already exist in codebase (Google, Slack) - GitLab OAuth follows same model
- GitLab CI/CD would complement (not replace) GitHub Actions

### 1.2 What This Includes

| Component | Description | New File |
|-----------|-------------|----------|
| GitLab OAuth Application | GitLab OAuth2 app for API access | No (GitLab UI) |
| 1Password Vault Items | Credential storage for GitLab OAuth | No (1Password) |
| `.gitlab-ci.yml` | GitLab CI/CD pipeline | **Yes** |
| GitLab API Client | OAuth-enabled API client | **Yes** |
| CI/CD Scripts | Build, test, deploy scripts | **Yes** |
| n8n Integration | GitLab webhook workflows | **Yes** |

### 1.3 What This Excludes

- GitHub Actions → GitLab pipeline sync (not in scope)
- Migrating existing CI/CD from GitHub Actions
- GitLab runner setup (assumes existing runners at 192.168.50.215)

### 1.4 Assumptions

1. GitLab instance is accessible at `http://gitlab.jclee.me`
2. User has admin access to GitLab to create OAuth application
3. GitLab runners are already configured and available
4. 1Password vault `homelab` is available for credential storage
5. Existing `GITLAB_TOKEN` in `.env.example` will be replaced with OAuth flow

---

## 2. Architecture Overview

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitLab Instance                          │
│                   http://gitlab.jclee.me                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ OAuth App   │  │ GitLab CI/CD │  │ GitLab API (v4)     │  │
│  │ (GitLab OAuth2) │  │ Pipeline     │  │                     │  │
│  └─────────────┘  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    OAuth Token (GITLAB_OAUTH_TOKEN)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline (.gitlab-ci.yml)              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │
│  │ Build Job  │→ │ Test Job   │→ │ Deploy Job             │  │
│  └────────────┘  └────────────┘  └────────────────────────┘  │
│         │                               │                       │
│         └───────── 1Password ─────────┘                       │
│                    (Credential Storage)                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 OAuth Flow

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│  CI/CD  │────────→│ GitLab OAuth │────────→│ GitLab API   │
│ Pipeline │  1. Auth Request   │  2. Token   │  3. API Call │
└──────────┘         └──────────────┘         └──────────────┘
```

**OAuth Flow Details:**
1. Pipeline requests token from `/oauth/token`
2. GitLab returns access token with requested scopes
3. Pipeline uses token for API calls
4. Token cached for pipeline duration (typically 1-4 hours)

---

## 3. Implementation Phases

### Phase 1: GitLab OAuth Application Setup

**Owner:** Human (requires GitLab UI access)  
**Duration:** 15 minutes  
**Blocking:** Yes - all subsequent phases depend on OAuth credentials

#### Step 1.1: Create GitLab OAuth Application

1. Navigate to GitLab: `http://gitlab.jclee.me`
2. Go to: **Settings** → **Applications**
3. Click **Add new application**
4. Configure:
   - **Name:** `resume-cicd`
   - **Redirect URI:** `http://gitlab.jclee.me/oauth/token`
   - **Confidential:** Yes (for server-side apps)
5. Select scopes:
   ```
   ✓ api          (Full API access)
   ✓ read_api     (Read API access) 
   ✓ read_repository (Read repositories)
   ✓ write_repository (Write repositories)
   ✓ openid       (OpenID Connect)
   ✓ profile      (User profile)
   ```
6. Click **Save application**
7. **Record:** Application ID and Secret

#### Step 1.2: Create 1Password Vault Items

1. Open 1Password → `homelab` vault
2. Create new item: **GitLab OAuth** (Login type)

```
Item: GitLab OAuth (homelab vault)
├── Application ID: [from Step 1.1]
├── Client Secret: [from Step 1.1]  
└── Access Token: [to be filled after first OAuth flow]
```

3. Create/edit item: **GitLab CI/CD** (Password type)

```
Item: GitLab CI/CD (homelab vault)
├── GITLAB_URL: http://gitlab.jclee.me
├── GITLAB_OAUTH_APP_ID: [from Step 1.1]
├── GITLAB_OAUTH_CLIENT_SECRET: [from Step 1.1]
└── GITLAB_RUNNER_TOKEN: [if using specific runner]
```

**Reference paths for later:**
- `op://homelab/gitlab-oauth/application-id`
- `op://homelab/gitlab-oauth/client-secret`
- `op://homelab/gitlab-cicd/gitlab-url`

---

### Phase 2: Create `.gitlab-ci.yml` Pipeline

**Owner:** Developer  
**Duration:** 2 hours  
**File:** `/home/jclee/dev/resume/.gitlab-ci.yml` (NEW)

#### Step 2.1: Create Pipeline Configuration

**File:** `.gitlab-ci.yml`

```yaml
# =============================================================================
# GitLab CI/CD Pipeline for Resume Portfolio
# =============================================================================
# OAuth-based authentication for GitLab API access
# =============================================================================

image: node:22-alpine

# OAuth Token Retrieval (before_script)
# Retrieves GitLab OAuth token using client credentials flow
.get_oauth_token:
  - |
    if [ -z "$GITLAB_OAUTH_TOKEN" ]; then
      echo "Fetching GitLab OAuth token..."
      TOKEN_RESPONSE=$(curl -s -X POST "${GITLAB_URL}/oauth/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=client_credentials" \
        -d "client_id=${GITLAB_OAUTH_APP_ID}" \
        -d "client_secret=${GITLAB_OAUTH_CLIENT_SECRET}" \
        -d "scope=api read_api")
      GITLAB_OAUTH_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')
      if [ "$GITLAB_OAUTH_TOKEN" == "null" ] || [ -z "$GITLAB_OAUTH_TOKEN" ]; then
        echo "Failed to obtain OAuth token"
        exit 1
      fi
      echo "GITLAB_OAUTH_TOKEN=$GITLAB_OAUTH_TOKEN" >> variables
    fi

# Default variables
variables:
  GITLAB_URL: ${GITLAB_URL}
  GITLAB_OAUTH_APP_ID: ${GITLAB_OAUTH_APP_ID}
  GITLAB_OAUTH_CLIENT_SECRET: ${GITLAB_OAUTH_CLIENT_SECRET}

stages:
  - validate
  - build
  - test
  - deploy

# =============================================================================
# Stage: Validate
# =============================================================================
lint:
  stage: validate
  tags:
    - docker
  before_script:
    - apk add --no-cache nodejs npm
    - npm ci --prefix apps/portfolio
  script:
    - npm run lint --prefix apps/portfolio
    - npm run typecheck
  allow_failure: false

# =============================================================================
# Stage: Build
# =============================================================================
build:
  stage: build
  tags:
    - docker
  before_script:
    - apk add --no-cache nodejs npm git
    - npm ci
    - source variables 2>/dev/null || true
  script:
    - npm run sync:data
    - npm run build --prefix apps/portfolio
  artifacts:
    paths:
      - apps/portfolio/worker.js
      - apps/portfolio/data.json
    expire_in: 1 hour
  allow_failure: false

# =============================================================================
# Stage: Test
# =============================================================================
unit-test:
  stage: test
  tags:
    - docker
  before_script:
    - apk add --no-cache nodejs npm
    - npm ci
  script:
    - npm test
  coverage: '/Lines\s*:\s*([0-9.]+)/'
  allow_failure: false

e2e-test:
  stage: test
  tags:
    - docker
  before_script:
    - apk add --no-cache nodejs npm git
    - npm ci
    - npx playwright install --with-deps chromium
  script:
    - npm run build --prefix apps/portfolio
    - npm run test:e2e
  allow_failure: false

# =============================================================================
# Stage: Deploy
# =============================================================================
deploy-production:
  stage: deploy
  tags:
    - docker
  environment:
    name: production
    url: https://resume.jclee.me
  before_script:
    - apk add --no-cache nodejs npm git curl
    - npm ci
    - source variables 2>/dev/null || true
  script:
    - echo "Deploying to production via Cloudflare Workers"
    - npm run build --prefix apps/portfolio
    - npx wrangler deploy --config apps/portfolio/wrangler.toml
  only:
    - master
  when: manual
  allow_failure: false

# =============================================================================
# Optional: Security Scan
# =============================================================================
security-scan:
  stage: validate
  tags:
    - docker
  before_script:
    - apk add --no-cache gitleaks curl
    - curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v8.22.1/gitleaks_8.22.1_linux_x64.tar.gz | tar xz
    - mv gitleaks /usr/local/bin/
  script:
    - gitleaks detect --source . --config .gitleaks.toml --verbose --no-git
  allow_failure: true
  allow_failure: false
```

#### Step 2.2: Add GitLab CI Variables

In GitLab UI: **Settings** → **CI/CD** → **Variables**

| Variable | Value | Type | Protected |
|----------|-------|------|-----------|
| `GITLAB_URL` | `http://gitlab.jclee.me` | Variable | No |
| `GITLAB_OAUTH_APP_ID` | (from 1Password) | Variable | No |
| `GITLAB_OAUTH_CLIENT_SECRET` | (from 1Password) | Masked | Yes |
| `GITLAB_RUNNER_TOKEN` | (runner token) | Masked | Yes |

---

### Phase 3: GitLab API Client Implementation

**Owner:** Developer  
**Duration:** 4 hours  
**Files:** 
- `/home/jclee/dev/resume/packages/shared/src/clients/gitlab/index.js` (NEW)
- `/home/jclee/dev/resume/packages/shared/src/clients/gitlab/gitlab-api.js` (NEW)
- `/home/jclee/dev/resume/packages/shared/src/clients/gitlab/types.js` (NEW)

#### Step 3.1: Create Client Structure

**Directory:** `packages/shared/src/clients/gitlab/`

```
gitlab/
├── index.js           # exports
├── gitlab-api.js      # main client class  
├── http-client.js     # transport layer
└── types.js          # type definitions
```

**File:** `packages/shared/src/clients/gitlab/http-client.js`

```javascript
/**
 * GitLab HTTP Client with OAuth authentication
 */
export class GitLabHttpClient {
  #baseUrl;
  #oauthToken;
  #accessToken;

  constructor(options = {}) {
    this.#baseUrl = options.baseUrl || process.env.GITLAB_URL;
    this.#oauthToken = options.oauthToken || process.env.GITLAB_OAUTH_TOKEN;
  }

  /**
   * Obtain OAuth token using client credentials flow
   */
  async fetchOAuthToken() {
    const response = await fetch(`${this.#baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.#oauthToken.clientId,
        client_secret: this.#oauthToken.clientSecret,
        scope: 'api read_api read_repository',
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth token fetch failed: ${response.status}`);
    }

    const data = await response.json();
    this.#accessToken = data.access_token;
    return this.#accessToken;
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    if (!this.#accessToken) {
      await this.fetchOAuthToken();
    }

    const url = `${this.#baseUrl}/api/v4${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.#accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, re-fetch
      await this.fetchOAuthToken();
      return this.request(endpoint, options);
    }

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status}`);
    }

    return response.json();
  }
}
```

**File:** `packages/shared/src/clients/gitlab/gitlab-api.js`

```javascript
import { GitLabHttpClient } from './http-client.js';

/**
 * GitLab API Client
 * OAuth-enabled client for GitLab API v4
 */
export class GitLabAPI {
  #client;

  constructor(options = {}) {
    this.#client = new GitLabHttpClient({
      baseUrl: options.baseUrl || process.env.GITLAB_URL,
      oauthToken: {
        clientId: options.clientId || process.env.GITLAB_OAUTH_APP_ID,
        clientSecret: options.clientSecret || process.env.GITLAB_OAUTH_CLIENT_SECRET,
      },
    });
  }

  // Projects
  async getProjects(options = {}) {
    return this.#client.request('/projects', {
      query: options,
    });
  }

  async getProject(projectId) {
    return this.#client.request(`/projects/${encodeURIComponent(projectId)}`);
  }

  // Jobs
  async getJobs(projectId, options = {}) {
    return this.#client.request(`/projects/${projectId}/jobs`, {
      query: options,
    });
  }

  async triggerPipeline(projectId, ref, variables = []) {
    return this.#client.request(`/projects/${projectId}/pipeline`, {
      method: 'POST',
      body: JSON.stringify({ ref, variables }),
    });
  }

  async getPipelineStatus(projectId, pipelineId) {
    return this.#client.request(`/projects/${projectId}/pipelines/${pipelineId}`);
  }

  // CI/CD Variables
  async getVariables(projectId) {
    return this.#client.request(`/projects/${projectId}/variables`);
  }

  async createVariable(projectId, key, value, options = {}) {
    return this.#client.request(`/projects/${projectId}/variables`, {
      method: 'POST',
      body: JSON.stringify({ key, value, ...options }),
    });
  }

  async deleteVariable(projectId, key) {
    return this.#client.request(`/projects/${projectId}/variables/${key}`, {
      method: 'DELETE',
    });
  }

  // Runners
  async getRunners(projectId) {
    return this.#client.request(`/projects/${projectId}/runners`);
  }

  async registerRunner(projectId, token, description) {
    return this.#client.request('/runners', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, token, description }),
    });
  }
}

export default GitLabAPI;
```

**File:** `packages/shared/src/clients/gitlab/index.js`

```javascript
export { GitLabAPI } from './gitlab-api.js';
export { GitLabHttpClient } from './http-client.js';
export * from './types.js';
```

---

### Phase 4: n8n GitLab Integration

**Owner:** Developer  
**Duration:** 2 hours  
**Files:**
- `/home/jclee/dev/resume/infrastructure/n8n/gitlab-webhook-workflow.json` (NEW)
- `/home/jclee/dev/resume/docs/guides/GITLAB_N8N_INTEGRATION.md` (NEW)

#### Step 4.1: Create n8n GitLab Webhook Workflow

**File:** `infrastructure/n8n/gitlab-webhook-workflow.json`

```json
{
  "name": "GitLab CI/CD Webhook Handler",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "gitlab-webhook",
        "responseMode": "lastNode",
        "options": {}
      },
      "name": "GitLab Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "conditions": {
          "conditions": [
            {
              "id": "object-contains",
              "leftValue": "={{ $json.object_kind }}",
              "rightValue": "pipeline",
              "operator": { "type": "string", "operation": "equals" }
            }
          ]
        }
      },
      "name": "Is Pipeline Event?",
      "type": "n8n-nodes-base.if",
      "position": [450, 300]
    },
    {
      "parameters": {
        "url": "={{ $env.GITLAB_API_URL }}/api/v4/projects/={{ $json.project_id }}/pipelines/={{ $json.pipeline.id }}",
        "options": {
          "timeout": 10000
        }
      },
      "name": "Get Pipeline Status",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 200]
    },
    {
      "parameters": {
        "conditions": {
          "conditions": [
            {
              "id": "status-success",
              "leftValue": "={{ $json.status }}",
              "rightValue": "success",
              "operator": { "type": "string", "operation": "equals" }
            }
          ]
        }
      },
      "name": "Pipeline Success?",
      "type": "n8n-nodes-base.if",
      "position": [850, 200]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/sendMessage",
        "body": {
          "chat_id": "{{ $env.TELEGRAM_CHAT_ID }}",
          "text": "✅ GitLab Pipeline Success\nProject: {{ $json.project.name }}\nPipeline: #{{ $json.pipeline.id }}\nStatus: {{ $json.pipeline.status }}"
        }
      },
      "name": "Telegram Success",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1050, 150]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/sendMessage",
        "body": {
          "chat_id": "{{ $env.TELEGRAM_CHAT_ID }}",
          "text": "❌ GitLab Pipeline Failed\nProject: {{ $json.project.name }}\nPipeline: #{{ $json.pipeline.id }}\nStatus: {{ $json.pipeline.status }}"
        }
      },
      "name": "Telegram Failure",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1050, 350]
    }
  ],
  "connections": {
    "GitLab Webhook": {
      "main": [[{ "node": "Is Pipeline Event?", "type": "main", "index": 0 }]]
    },
    "Is Pipeline Event?": {
      "main": [[{ "node": "Get Pipeline Status", "type": "main", "index": 0 }]]
    },
    "Get Pipeline Status": {
      "main": [[{ "node": "Pipeline Success?", "type": "main", "index": 0 }]]
    },
    "Pipeline Success?": {
      "main": [
        [{ "node": "Telegram Success", "type": "main", "index": 0 }],
        [{ "node": "Telegram Failure", "type": "main", "index": 0 }]
      ]
    }
  }
}
```

#### Step 4.2: Create Integration Guide

**File:** `docs/guides/GITLAB_N8N_INTEGRATION.md`

```markdown
# GitLab n8n Integration Guide

## Overview

This guide describes how to integrate GitLab CI/CD with n8n workflows using OAuth authentication.

## Prerequisites

- GitLab instance at `http://gitlab.jclee.me`
- GitLab OAuth application configured
- n8n instance at `https://n8n.jclee.me`
- Telegram bot for notifications

## GitLab Webhook Setup

### 1. Create Webhook in GitLab

1. Navigate to: `http://gitlab.jclee.me`
2. Go to: **Project** → **Settings** → **Webhooks**
3. Add webhook:
   - **URL:** `https://n8n.jclee.me/webhook/gitlab-webhook`
   - **Trigger:** Pipeline events
   - **SSL verification:** Enable
4. Click **Add webhook**

### 2. Configure n8n Credentials

In n8n UI:
1. **Settings** → **Variables**
2. Add:
   - `GITLAB_API_URL` = `http://gitlab.jclee.me`
   - `TELEGRAM_BOT_TOKEN` = (from 1Password)
   - `TELEGRAM_CHAT_ID` = (from 1Password)

### 3. Import Workflow

Import `infrastructure/n8n/gitlab-webhook-workflow.json` to n8n.

## Testing

```bash
# Test webhook manually
curl -X POST https://n8n.jclee.me/webhook/gitlab-webhook \
  -H "Content-Type: application/json" \
  -d '{"object_kind": "pipeline", "project": {"name": "test"}, "pipeline": {"id": 1, "status": "success"}}'
```

## Troubleshooting

See `infrastructure/n8n/README.md` for general n8n troubleshooting.
```

---

### Phase 5: Documentation Updates

**Owner:** Developer  
**Duration:** 1 hour  
**Files:**
- `/home/jclee/dev/resume/.env.example` (UPDATE)
- `/home/jclee/dev/resume/AGENTS.md` (UPDATE)
- `/home/jclee/dev/resume/docs/SECURITY_WARNING.md` (UPDATE)

#### Step 5.1: Update `.env.example`

**File:** `.env.example`

Add after line 67:

```bash
# ----------------------------------------------------------------------------
# GitLab CI/CD OAuth credentials
# ----------------------------------------------------------------------------
GITLAB_URL=http://gitlab.jclee.me
GITLAB_OAUTH_APP_ID=your_gitlab_oauth_app_id
GITLAB_OAUTH_CLIENT_SECRET=your_gitlab_oauth_client_secret
GITLAB_RUNNER_TOKEN=your_gitlab_runner_token
```

#### Step 5.2: Update `AGENTS.md`

Add to project structure and WHERE TO LOOK tables:

```markdown
## WHERE TO LOOK

| Task                          | Location               | Notes                              |
| ----------------------------- | --------------------- | ---------------------------------- |
| GitLab CI/CD pipeline         | `.gitlab-ci.yml`      | OAuth-based GitLab pipeline        |
| GitLab API client             | `packages/shared/src/clients/gitlab/` | OAuth-enabled client |
| GitLab n8n integration       | `infrastructure/n8n/gitlab-*.json` | Webhook workflows |
```

#### Step 5.3: Update `SECURITY_WARNING.md`

Update GitLab row:

```markdown
| **GitLab**     | `GITLAB_OAUTH_CLIENT_SECRET` | Revoke & Re-issue | 🟢 OAuth (rotatable) |
```

---

## 4. OAuth2 Scopes Specification

### 4.1 Required Scopes

| Scope | Purpose | Risk Level |
|-------|---------|------------|
| `api` | Full API access (required for CI/CD) | Medium |
| `read_api` | Read API access | Low |
| `read_repository` | Clone/fetch repos | Low |
| `write_repository` | Push to repos | Medium |
| `openid` | OpenID Connect (optional) | Low |
| `profile` | User profile (optional) | Low |

### 4.2 Scope Justification

**`api` (Required):**
- Needed to trigger pipelines
- Manage CI/CD variables
- Query job/pipeline status
- Cannot be achieved with narrower scopes for full CI/CD functionality

**`read_repository` (Required):**
- Clone repository for build
- Fetch dependencies
- Standard for any CI/CD pipeline

**`write_repository` (Conditional):**
- Only needed if pipeline pushes to repo
- Can be omitted for read-only pipelines

### 4.3 Token Lifespan

GitLab OAuth tokens typically expire in **2 hours** (7200 seconds).
Pipeline must handle token refresh within long-running jobs.

---

## 5. 1Password Integration

### 5.1 Vault Structure

**Vault:** `homelab`

| Item Name | Fields | Type |
|-----------|--------|------|
| `GitLab OAuth` | Application ID, Client Secret | Login |
| `GitLab CI/CD` | GITLAB_URL, Runner Token | Password |

### 5.2 GitHub Actions Reference Pattern

```yaml
# From wanted-resume-sync.yml pattern
- name: Load GitLab secrets from 1Password
  uses: 1password/load-secrets-action@dafbe7cb03502b260e2b2893c753c352eee545bf
  with:
    export-env: true
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
    GITLAB_URL: op://homelab/gitlab-cicd/gitlab-url
    GITLAB_OAUTH_APP_ID: op://homelab/gitlab-oauth/application-id
    GITLAB_OAUTH_CLIENT_SECRET: op://homelab/gitlab-oauth/client-secret
```

### 5.3 Alternative: GitLab CI/CD Variables

Set in GitLab UI: **Settings** → **CI/CD** → **Variables**

| Key | Value | Type |
|-----|-------|------|
| `GITLAB_URL` | `http://gitlab.jclee.me` | Variable |
| `GITLAB_OAUTH_APP_ID` | (from OAuth app) | Variable |
| `GITLAB_OAUTH_CLIENT_SECRET` | (from OAuth app) | Masked |

---

## 6. Verification Checklist

### 6.1 Pre-Implementation Verification

- [ ] GitLab OAuth application created at `http://gitlab.jclee.me`
- [ ] OAuth credentials stored in 1Password (`homelab` vault)
- [ ] GitLab runner available and tagged
- [ ] Network access confirmed to GitLab from CI/CD runners

### 6.2 Post-Implementation Verification

#### OAuth Flow Test
```bash
# Manual OAuth token fetch
curl -X POST "http://gitlab.jclee.me/oauth/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_SECRET" \
  -d "scope=api read_api"

# Expected: {"access_token": "xxx", "token_type": "bearer", "expires_in": 7200}
```

#### Pipeline Test
```bash
# Trigger pipeline manually via GitLab UI
# Or via API:
curl -X POST "http://gitlab.jclee.me/api/v4/projects/PROJECT_ID/pipeline" \
  -H "PRIVATE-TOKEN: YOUR_TOKEN" \
  -d "ref=master"

# Verify:
# - lint job passes
# - build job creates worker.js
# - test job runs unit tests
# - deploy job (manual) deploys to Cloudflare
```

#### API Client Test
```javascript
// Test GitLab API client
import { GitLabAPI } from '@resume/shared/clients/gitlab';

const gitlab = new GitLabAPI({
  baseUrl: 'http://gitlab.jclee.me',
  clientId: process.env.GITLAB_OAUTH_APP_ID,
  clientSecret: process.env.GITLAB_OAUTH_CLIENT_SECRET,
});

const projects = await gitlab.getProjects();
console.log('Projects:', projects);
```

#### n8n Webhook Test
```bash
# Send test webhook to n8n
curl -X POST "https://n8n.jclee.me/webhook/gitlab-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object_kind": "pipeline",
    "project": {"name": "resume"},
    "pipeline": {"id": 123, "status": "success"}
  }'

# Expected: Telegram notification received
```

### 6.3 Security Verification

- [ ] `GITLAB_OAUTH_CLIENT_SECRET` is masked in GitLab CI/CD variables
- [ ] OAuth token not logged in pipeline output
- [ ] Token refresh handled properly in long jobs
- [ ] GitLab OAuth application has minimum required scopes
- [ ] 1Password vault access audited

---

## 7. Risk Assessment

### 7.1 Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OAuth token expiration during long pipeline | Medium | Pipeline failure | Implement token refresh logic |
| GitLab instance unreachable | Low | Pipeline failure | Add retry with exponential backoff |
| OAuth credentials misconfigured | Medium | Authentication failure | Validate before pipeline start |
| Scope too broad (security) | Low | Overprivileged token | Use minimum scopes: `api read_api read_repository` |
| Token rotation requires app redeploy | Low | Operational inconvenience | Document rotation procedure |

### 7.2 Fallback Strategy

If OAuth flow fails, pipeline can fall back to **Deploy Token**:
- Create GitLab deploy token with read-only repository access
- Store in same 1Password vault
- Use for repository cloning only
- Use OAuth for API operations

---

## 8. File Change Summary

### 8.1 New Files

| File | Purpose |
|------|---------|
| `.gitlab-ci.yml` | GitLab CI/CD pipeline definition |
| `packages/shared/src/clients/gitlab/index.js` | Client exports |
| `packages/shared/src/clients/gitlab/gitlab-api.js` | Main API client |
| `packages/shared/src/clients/gitlab/http-client.js` | OAuth transport layer |
| `packages/shared/src/clients/gitlab/types.js` | Type definitions |
| `infrastructure/n8n/gitlab-webhook-workflow.json` | n8n webhook workflow |
| `docs/guides/GITLAB_N8N_INTEGRATION.md` | Integration guide |

### 8.2 Modified Files

| File | Change |
|------|--------|
| `.env.example` | Add GitLab OAuth variables |
| `AGENTS.md` | Document GitLab CI/CD components |
| `docs/SECURITY_WARNING.md` | Update GitLab security entry |

### 8.3 OnePassword Items (External)

| Vault | Item | Fields |
|-------|------|--------|
| `homelab` | `GitLab OAuth` | Application ID, Client Secret |
| `homelab` | `GitLab CI/CD` | GITLAB_URL, Runner Token |

---

## 9. Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: OAuth App Setup | 15 min | GitLab admin access |
| Phase 2: .gitlab-ci.yml | 2 hrs | None |
| Phase 3: GitLab API Client | 4 hrs | Phase 1 |
| Phase 4: n8n Integration | 2 hrs | Phase 1, Phase 3 |
| Phase 5: Documentation | 1 hr | Phase 2, Phase 3 |
| **Total** | **~10 hours** | |

---

## 10. Next Steps

1. **Immediate**: Create GitLab OAuth application in GitLab UI
2. **Immediate**: Add credentials to 1Password vault
3. **This session**: Create `.gitlab-ci.yml` pipeline
4. **This session**: Create GitLab API client
5. **Follow-up**: Test OAuth flow end-to-end
6. **Follow-up**: Configure GitLab webhook in n8n

---

## Appendix A: GitLab API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth/token` | POST | Obtain OAuth token |
| `/api/v4/projects` | GET | List projects |
| `/api/v4/projects/:id` | GET | Get project |
| `/api/v4/projects/:id/pipelines` | POST | Trigger pipeline |
| `/api/v4/projects/:id/pipelines/:pid` | GET | Get pipeline status |
| `/api/v4/projects/:id/jobs` | GET | List jobs |
| `/api/v4/projects/:id/variables` | GET/POST | Manage CI/CD vars |
| `/api/v4/runners` | GET | List runners |

## Appendix B: Reference Implementation

This plan follows existing patterns from:

- `.github/workflows/wanted-resume-sync.yml` - 1Password integration
- `infrastructure/n8n/SLACK_OAUTH2_SETUP.md` - OAuth credential setup
- `apps/job-server/src/shared/services/auth/auth-service.js` - OAuth flow
- `apps/job-server/src/shared/clients/wanted/wanted-api.js` - API client pattern
