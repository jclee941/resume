# Dashboard Worker Routing Refactor (Oracle-Recommended)

## TL;DR

> **Quick Summary**: Refactor job-automation workers routing to router-first pattern, fixing security header gaps and restoring wrangler.toml compatibility with deploy.sh.
> 
> **Deliverables**:
> - Router-first pattern in index.js (static as fallback)
> - Security headers on OPTIONS preflight responses
> - Restored wrangler.toml from backup
> - CORS headers on static responses
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (wrangler.toml) → Task 4 (deploy verification)

---

## Context

### Original Request
Implement Oracle's three recommendations for apps/job-dashboard/:
1. Router-first pattern (remove path exceptions)
2. Restore wrangler.toml
3. Apply security headers to OPTIONS response

### Current State Analysis

**Current Flow (Exception-Based - BROKEN):**
```
REQUEST
  ↓
[Line 33-35] OPTIONS → 204 + corsHeaders() [❌ NO security headers]
  ↓
[Line 37-72] Middleware: Rate Limit → Auth → Webhook → CSRF
  ↓
[Line 206-209] STATIC FALLBACK (if !startsWith('/api/') && !== '/health')
  ├─ serveStatic() returns Response
  └─ return addCsrfCookie(staticResponse) [❌ NO CORS headers]
  ↓
[Line 211-222] ROUTER HANDLING
  ├─ response = await router.handle(request, url)
  └─ addCorsHeaders() applied [✅ Works]
```

**Issues Identified:**
1. **Line 33-35**: OPTIONS uses `corsHeaders()` not `addCorsHeaders()` - missing security headers
2. **Lines 206-209**: Static check BEFORE router - exception-based, fragile
3. **Line 208**: Static response missing CORS via `addCorsHeaders()`
4. **wrangler.toml missing**: Only jsonc exists, but deploy.sh uses sed on toml

### Key Files
- `workers/src/index.js` - Main fetch handler (320 lines)
- `workers/src/router.js` - Router class (44 lines, handle() returns null if no match)
- `workers/src/middleware/cors.js` - corsHeaders() returns headers only, addCorsHeaders() adds security headers
- `workers/wrangler.jsonc` - Current config, name: "job-production"
- `workers/wrangler.toml.bak` - Backup with correct name: "job"
- `workers/deploy.sh` - Uses sed on wrangler.toml (lines 33, 44)

---

## Work Objectives

### Core Objective
Fix routing architecture and security header gaps in the dashboard worker.

### Concrete Deliverables
- Modified `workers/src/index.js` with router-first pattern
- Restored `workers/wrangler.toml` from backup
- Deleted `workers/wrangler.jsonc` (superseded)
- All responses (including OPTIONS and static) include security headers

### Definition of Done
- [ ] `/health` endpoint accessible with CORS headers
- [ ] Static files (/, /index.html) served with security headers
- [ ] OPTIONS preflight returns security headers (HSTS, X-Content-Type-Options, etc.)
- [ ] `wrangler deploy --env production` succeeds
- [ ] No regression on existing API routes

### Must Have
- Router handles ALL requests first, static is fallback only
- Security headers on every response (via addCorsHeaders)
- wrangler.toml restored with correct worker name

### Must NOT Have (Guardrails)
- DO NOT add new routes or change existing route behavior
- DO NOT modify handler implementations (only routing flow)
- DO NOT change CORS origin allowlist
- DO NOT modify rate limit or auth middleware logic
- DO NOT introduce new dependencies

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no .test.js or .spec.js files in workers/)
- **Automated tests**: None (no test framework configured)
- **Agent-Executed QA**: ALWAYS (mandatory, primary verification method)

### Agent-Executed QA Scenarios (ALL tasks)

Every task includes curl-based verification for API responses and wrangler-based deployment checks.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Restore wrangler.toml [no dependencies]
├── Task 2: Fix OPTIONS security headers [no dependencies]
└── Task 3: Router-first + static fallback [no dependencies]

Wave 2 (After Wave 1):
└── Task 4: Deploy and verify [depends: 1, 2, 3]

Critical Path: Tasks 1,2,3 → Task 4
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4 | 2, 3 |
| 2 | None | 4 | 1, 3 |
| 3 | None | 4 | 1, 2 |
| 4 | 1, 2, 3 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | dispatch parallel, category="quick" |
| 2 | 4 | sequential after Wave 1, category="quick" |

---

## TODOs

- [ ] 1. Restore wrangler.toml from backup

  **What to do**:
  - Copy `wrangler.toml.bak` to `wrangler.toml`
  - Verify the content has `name = "job"` (not "job-production")
  - Delete `wrangler.jsonc` (superseded by restored toml)
  - Verify deploy.sh sed commands will work on restored toml

  **Must NOT do**:
  - DO NOT modify any binding IDs or database IDs
  - DO NOT change environment configurations
  - DO NOT modify cron schedules

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file copy and delete operation
  - **Skills**: []
    - No special skills needed for file operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `workers/wrangler.toml.bak:1-91` - Source file to restore (has correct name = "job")
  - `workers/wrangler.jsonc:1-36` - File to delete (has wrong name = "job-production")

  **Script References**:
  - `workers/deploy.sh:33` - `sed -i "s/REPLACE_AFTER_CREATE/$D1_ID/" wrangler.toml` - expects toml
  - `workers/deploy.sh:44` - `sed -i "s/id = \"REPLACE_AFTER_CREATE\"/id = \"$KV_ID\"/" wrangler.toml` - expects toml

  **WHY Each Reference Matters**:
  - The backup has the correct config structure for `--env production` deployment
  - deploy.sh expects wrangler.toml (not jsonc) for sed operations

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: wrangler.toml restored correctly
    Tool: Bash (shell commands)
    Preconditions: In workers/ directory
    Steps:
      1. cat wrangler.toml | head -3
      2. Assert: Line 1 contains 'name = "job"'
      3. Assert: File exists at workers/wrangler.toml
      4. ls wrangler.jsonc 2>&1
      5. Assert: Output contains "No such file" (deleted)
    Expected Result: wrangler.toml exists with correct name, jsonc deleted
    Evidence: Terminal output captured

  Scenario: deploy.sh sed targets exist in restored toml
    Tool: Bash (grep)
    Preconditions: wrangler.toml restored
    Steps:
      1. grep -c "database_id" wrangler.toml
      2. Assert: Output is non-zero (database_id lines exist)
      3. grep "env.production" wrangler.toml
      4. Assert: Output shows production environment section
    Expected Result: sed targets present in toml
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `fix(workers): restore wrangler.toml from backup`
  - Files: `workers/wrangler.toml`, delete `workers/wrangler.jsonc`
  - Pre-commit: N/A (no tests)

---

- [ ] 2. Add security headers to OPTIONS preflight response

  **What to do**:
  - Modify lines 33-35 in index.js
  - Create a proper Response object and apply addCorsHeaders() to it
  - Keep status 204 (no content) for preflight

  **Current code (lines 33-35)**:
  ```javascript
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  ```

  **Target code**:
  ```javascript
  if (request.method === 'OPTIONS') {
    return addCorsHeaders(new Response(null, { status: 204 }), origin);
  }
  ```

  **Must NOT do**:
  - DO NOT change the OPTIONS status code (keep 204)
  - DO NOT modify corsHeaders() function
  - DO NOT modify addCorsHeaders() function
  - DO NOT add any new logic to OPTIONS handling

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line change, clear transformation
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `workers/src/index.js:33-35` - Current OPTIONS handling (uses corsHeaders only)
  - `workers/src/index.js:39-45` - Example of addCorsHeaders() usage pattern for rate limit response
  - `workers/src/index.js:51` - Another addCorsHeaders() usage pattern

  **API/Type References**:
  - `workers/src/middleware/cors.js:7-18` - corsHeaders() returns raw header object only
  - `workers/src/middleware/cors.js:20-41` - addCorsHeaders() adds CORS + security headers (HSTS, X-Content-Type-Options, etc.)

  **WHY Each Reference Matters**:
  - corsHeaders() only returns CORS headers (Access-Control-*)
  - addCorsHeaders() wraps response AND adds security headers (lines 26-39)
  - All other responses use addCorsHeaders(), OPTIONS should match

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: OPTIONS preflight includes security headers
    Tool: Bash (curl)
    Preconditions: Worker deployed (Task 4) OR local wrangler dev running
    Steps:
      1. curl -s -I -X OPTIONS https://job.jclee.me/api/health \
           -H "Origin: https://resume.jclee.me" \
           -H "Access-Control-Request-Method: GET"
      2. Assert: Response contains "Strict-Transport-Security"
      3. Assert: Response contains "X-Content-Type-Options: nosniff"
      4. Assert: Response contains "X-Frame-Options"
      5. Assert: Response contains "Access-Control-Allow-Origin"
      6. Assert: Status is 204
    Expected Result: OPTIONS returns both CORS and security headers
    Evidence: curl output captured

  Scenario: OPTIONS still denies non-allowed origins
    Tool: Bash (curl)
    Preconditions: Worker deployed
    Steps:
      1. curl -s -I -X OPTIONS https://job.jclee.me/api/health \
           -H "Origin: https://evil.com"
      2. Assert: Response does NOT contain "Access-Control-Allow-Origin: https://evil.com"
      3. Assert: Status is 204
    Expected Result: CORS origin check still works
    Evidence: curl output captured
  ```

  **Commit**: YES (group with Task 3)
  - Message: `fix(workers): add security headers to OPTIONS and static responses`
  - Files: `workers/src/index.js`
  - Pre-commit: N/A (no tests)

---

- [ ] 3. Implement router-first pattern with static fallback

  **What to do**:
  - Remove the static check block (lines 206-209)
  - Modify router handling block (lines 211-222) to check router first
  - If router returns null, THEN serve static (as fallback)
  - Apply addCorsHeaders() to static responses

  **Current code (lines 206-222)**:
  ```javascript
  // Serve static dashboard for non-API routes (except /health which needs CORS)
  if (!url.pathname.startsWith('/api/') && url.pathname !== '/health') {
    const staticResponse = serveStatic(url.pathname);
    return addCsrfCookie(staticResponse, request);
  }

  try {
    const response = await router.handle(request, url);
    if (response) {
      const withCsrf = addCsrfCookie(response, request);
      return addRateLimitHeaders(addCorsHeaders(withCsrf, origin), rateResult.headers);
    }
    return addCorsHeaders(jsonResponse({ error: 'Not found' }, 404), origin);
  } catch (error) {
    // ...error handling
  }
  ```

  **Target code**:
  ```javascript
  try {
    // Router-first: try all registered routes
    const response = await router.handle(request, url);
    if (response) {
      const withCsrf = addCsrfCookie(response, request);
      return addRateLimitHeaders(addCorsHeaders(withCsrf, origin), rateResult.headers);
    }
    
    // Static fallback: serve dashboard for non-API routes
    if (!url.pathname.startsWith('/api/')) {
      const staticResponse = serveStatic(url.pathname);
      const withCsrf = addCsrfCookie(staticResponse, request);
      return addCorsHeaders(withCsrf, origin);
    }
    
    // API route not found
    return addCorsHeaders(jsonResponse({ error: 'Not found' }, 404), origin);
  } catch (error) {
    // ...existing error handling unchanged
  }
  ```

  **Must NOT do**:
  - DO NOT change route registrations (keep all router.get/post/etc calls)
  - DO NOT modify serveStatic() function
  - DO NOT modify middleware order (rate limit → auth → webhook → csrf)
  - DO NOT change error handling logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Structural refactor of routing flow, ~15 lines changed
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `workers/src/index.js:206-209` - Current static check to REMOVE
  - `workers/src/index.js:211-222` - Current router handling to MODIFY
  - `workers/src/index.js:81-99` - /health route registration (must stay in router)

  **API/Type References**:
  - `workers/src/router.js:26-42` - router.handle() returns Response or null
  - `workers/src/views/dashboard.js` - serveStatic() returns Response

  **WHY Each Reference Matters**:
  - router.handle() returns null when no route matches - this is the signal to try static
  - Static serving should be fallback, not exception-based check
  - /health is already registered as a route (line 81), so it will match router first

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: /health route returns JSON with CORS headers
    Tool: Bash (curl)
    Preconditions: Worker deployed
    Steps:
      1. curl -s -i https://job.jclee.me/health \
           -H "Origin: https://resume.jclee.me"
      2. Assert: Response contains '"status":"ok"'
      3. Assert: Response contains "Access-Control-Allow-Origin"
      4. Assert: Response contains "Strict-Transport-Security"
      5. Assert: HTTP status is 200
    Expected Result: /health served by router with full headers
    Evidence: curl output captured

  Scenario: Static files served with security headers
    Tool: Bash (curl)
    Preconditions: Worker deployed
    Steps:
      1. curl -s -I https://job.jclee.me/ \
           -H "Origin: https://resume.jclee.me"
      2. Assert: Response contains "Content-Type: text/html"
      3. Assert: Response contains "Strict-Transport-Security"
      4. Assert: Response contains "X-Content-Type-Options"
      5. Assert: HTTP status is 200
    Expected Result: Static dashboard served with security headers
    Evidence: curl output captured

  Scenario: Unknown API route returns 404
    Tool: Bash (curl)
    Preconditions: Worker deployed
    Steps:
      1. curl -s https://job.jclee.me/api/nonexistent
      2. Assert: Response contains '"error":"Not found"'
      3. Assert: HTTP status is 404
    Expected Result: API 404 handled correctly
    Evidence: curl output captured

  Scenario: Existing API routes still work
    Tool: Bash (curl)
    Preconditions: Worker deployed
    Steps:
      1. curl -s https://job.jclee.me/api/health
      2. Assert: Response contains '"status":"ok"'
      3. Assert: Response contains '"version":"2.0.0"'
    Expected Result: No regression on existing routes
    Evidence: curl output captured
  ```

  **Commit**: YES (group with Task 2)
  - Message: `fix(workers): add security headers to OPTIONS and static responses`
  - Files: `workers/src/index.js`
  - Pre-commit: N/A (no tests)

---

- [ ] 4. Deploy and verify all changes

  **What to do**:
  - Deploy using wrangler with production environment
  - Verify all QA scenarios from Tasks 1-3 against production
  - Confirm no regression on dashboard functionality

  **Must NOT do**:
  - DO NOT deploy without completing Tasks 1-3
  - DO NOT skip any verification scenario

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Deployment and verification commands
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Documentation References**:
  - `workers/AGENTS.md` - Deployment instructions: `cd workers && ./deploy.sh` or `wrangler deploy`
  - `workers/deploy.sh` - Full deployment script (creates resources if needed)

  **WHY Each Reference Matters**:
  - deploy.sh handles D1/KV setup but uses sed on wrangler.toml (fixed in Task 1)
  - For existing setup, `npx wrangler deploy --env production` is sufficient

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Deployment succeeds
    Tool: Bash (wrangler)
    Preconditions: Tasks 1-3 complete, wrangler.toml exists
    Steps:
      1. cd apps/job-dashboard
      2. npx wrangler deploy --env production
      3. Assert: Output contains "Published" or "Deployed"
      4. Assert: Exit code is 0
    Expected Result: Worker deployed successfully
    Evidence: Terminal output captured

  Scenario: Production /health works with CORS
    Tool: Bash (curl)
    Preconditions: Deployment complete
    Steps:
      1. curl -s -i https://job.jclee.me/health \
           -H "Origin: https://resume.jclee.me"
      2. Assert: Status 200
      3. Assert: Response contains "Access-Control-Allow-Origin: https://resume.jclee.me"
      4. Assert: Response contains "Strict-Transport-Security"
    Expected Result: /health accessible from portfolio with CORS
    Evidence: curl output captured

  Scenario: Production OPTIONS preflight complete
    Tool: Bash (curl)
    Preconditions: Deployment complete
    Steps:
      1. curl -s -I -X OPTIONS https://job.jclee.me/api/health \
           -H "Origin: https://resume.jclee.me" \
           -H "Access-Control-Request-Method: GET"
      2. Assert: Status 204
      3. Assert: Contains "Strict-Transport-Security"
      4. Assert: Contains "Access-Control-Allow-Origin"
    Expected Result: OPTIONS preflight includes security headers
    Evidence: curl output captured

  Scenario: Production dashboard loads
    Tool: Bash (curl)
    Preconditions: Deployment complete
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" https://job.jclee.me/
      2. Assert: Status is 200
      3. curl -s https://job.jclee.me/ | head -5
      4. Assert: Output contains "<!DOCTYPE html>"
    Expected Result: Dashboard HTML served correctly
    Evidence: curl output captured

  Scenario: No regression on API endpoints
    Tool: Bash (curl)
    Preconditions: Deployment complete
    Steps:
      1. curl -s https://job.jclee.me/api/status | jq -r '.status'
      2. Assert: Output is "ok"
      3. curl -s https://job.jclee.me/api/stats | jq -r '.today'
      4. Assert: Output is a number (not error)
    Expected Result: API endpoints functioning
    Evidence: curl output captured
  ```

  **Commit**: NO (deployment only, no code changes)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(workers): restore wrangler.toml from backup` | wrangler.toml, -wrangler.jsonc | File exists with correct name |
| 2+3 | `fix(workers): add security headers to OPTIONS and static responses` | src/index.js | Deploy in Task 4 |
| 4 | N/A (deploy only) | N/A | curl tests |

---

## Success Criteria

### Verification Commands
```bash
# Health with CORS
curl -s -i https://job.jclee.me/health -H "Origin: https://resume.jclee.me"
# Expected: 200, Access-Control-Allow-Origin, Strict-Transport-Security

# OPTIONS preflight with security
curl -s -I -X OPTIONS https://job.jclee.me/api/health \
  -H "Origin: https://resume.jclee.me" \
  -H "Access-Control-Request-Method: GET"
# Expected: 204, Strict-Transport-Security, X-Content-Type-Options

# Static dashboard with headers
curl -s -I https://job.jclee.me/
# Expected: 200, Strict-Transport-Security, text/html

# API 404
curl -s https://job.jclee.me/api/nonexistent
# Expected: {"error":"Not found"}

# Deployment
cd apps/job-dashboard && npx wrangler deploy --env production
# Expected: Published successfully
```

### Final Checklist
- [ ] All "Must Have" present:
  - [ ] Router-first pattern implemented
  - [ ] Security headers on OPTIONS
  - [ ] wrangler.toml restored
  - [ ] Static responses have CORS
- [ ] All "Must NOT Have" absent:
  - [ ] No new routes added
  - [ ] No handler logic changes
  - [ ] No CORS origin list changes
  - [ ] No middleware order changes
  - [ ] No new dependencies
- [ ] All endpoints functional (no regression)
