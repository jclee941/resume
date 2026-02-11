# Job Automation Data Flow Architecture

Complete documentation of all data flows in the job-automation system: MCP requests, service orchestration, browser automation, worker communication, and database synchronization.

**Last Updated**: 2026-02-11  
**Scope**: MCP Server, Cloudflare Worker, Database (D1), Cache (KV), Sessions, External APIs

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Job Automation System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐    ┌──────────────┐  │
│  │   MCP Tools  │ ──────► │   Fastify    │ ◄──┤  Crawlers    │  │
│  │  (Claude)    │         │   Server     │    │  (HTTP/Ppntr)│  │
│  └──────────────┘         └──────┬───────┘    └──────────────┘  │
│                                  │                                │
│                         ┌────────▼────────┐                      │
│                         │ Shared Services │                      │
│                         │  (DI Container) │                      │
│                         └────────┬────────┘                      │
│                                  │                                │
│        ┌─────────────────────────┼─────────────────────────┐    │
│        │                         │                         │    │
│   ┌────▼────┐   ┌──────────┐  ┌─▼────────┐   ┌─────────┐ │    │
│   │UnifiedA-│   │Session   │  │Job       │   │Clients  │ │    │
│   │pplyInfo │   │Manager   │  │Matcher   │   │(Wanted, │ │    │
│   │m        │   │(Cookies) │  │(Scoring) │   │JobKorea)│ │    │
│   └────┬────┘   └──┬───────┘  └────┬────┘   └────┬────┘ │    │
│        │           │              │             │     │        │
│        └───────────┼──────────────┼─────────────┘     │        │
│                    │              │                   │        │
└────────────────────┼──────────────┼───────────────────┼────────┘
                     │              │                   │
                     ▼              ▼                   ▼
                ┌───────────────────────────────┐  ┌─────────┐
                │   Cloudflare Worker (D1/KV)   │  │External │
                │   - Dashboard /job/*          │  │ APIs    │
                │   - 8 Workflows               │  │ (Wanted)│
                │   - Cron triggers             │  └─────────┘
                └───────────────────────────────┘
```

---

## MCP Request Flow (Detailed)

### Phase 1: User Request (Claude → MCP Server)

```
User (Claude): "Find iOS developer jobs"
                           │
                           ▼
                    MCP Request JSON
        ┌─────────────────────────────────┐
        │ {                               │
        │   "name": "search-jobs",        │
        │   "arguments": {                │
        │     "keyword": "iOS",           │
        │     "limit": 10,                │
        │     "match_score": 70           │
        │   }                             │
        │ }                               │
        └─────────────────────────────────┘
                           │
                           ▼
                  MCP Server Receives
                  (src/index.js)
```

### Phase 2: Service Orchestration

```
MCP Handler (search-jobs tool)
                │
                ▼
        ┌──────────────────────┐
        │  Tool Resolver       │
        │  Maps: "search-jobs" │
        │  → tools/search-jobs │
        └──────────────────────┘
                │
                ▼
        ┌──────────────────────────────────┐
        │ DI Container Injects:             │
        │  - SessionManager                 │
        │  - JobMatcher                     │
        │  - WantedClient                   │
        │  - SlackService                   │
        │  - Logger                         │
        └──────────────────────────────────┘
                │
                ▼
        ┌──────────────────────────────────┐
        │ tools/search-jobs.js              │
        │  1. Parse arguments               │
        │  2. Validate input                │
        │  3. Call WantedClient.search()    │
        │  4. Filter by JobMatcher          │
        │  5. Format response               │
        └──────────────────────────────────┘
```

### Phase 3: Crawler Execution

```
WantedClient.search("iOS")
                │
                ▼
        ┌──────────────────────┐
        │ BaseCrawler.fetch()  │
        │  1. Randomize UA     │
        │  2. Add 1s delay     │
        │  3. Add 0-500ms jitter
        │  4. Retry 3x (2s/4s) │
        │  5. Set headers      │
        │  6. Include cookies  │
        └──────────────────────┘
                │
                ▼
        HTTP GET https://api.wanted.co.kr/v4/jobs?keyword=iOS
                │
                ▼ (Response: 200 OK, 15 jobs)
        ┌──────────────────────┐
        │ Format Response      │
        │ {                    │
        │   jobs: [...],       │
        │   count: 15,         │
        │   timestamp: now()   │
        │ }                    │
        └──────────────────────┘
```

### Phase 4: Skill Matching

```
JobMatcher.scoreJobs(jobs)
                │
                ▼
        ┌──────────────────────────────────┐
        │ 2-Tier Scoring System            │
        │                                  │
        │ Tier 1 (Fast): 60% threshold     │
        │  - Skill keyword match           │
        │  - Company size match            │
        │  - Experience level match        │
        │                                  │
        │ Tier 2 (AI): 75% threshold       │
        │  - Claude AI semantic match      │
        │  - Natural language analysis     │
        │  - Context-aware scoring        │
        └──────────────────────────────────┘
                │
        ┌───────┴───────────────────┐
        │                           │
        ▼ (Score < 60)        ▼ (Score >= 60)
    Skip Job            Tier 2 Evaluation
                                │
                        ┌───────┴──────┐
                        │              │
                    ▼ (< 75)        ▼ (>= 75)
                 REVIEW         AUTO_APPLY
```

### Phase 5: Application Flow (if >= 75)

```
auto-apply tool triggered
         │
         ▼
┌─────────────────────────┐
│ AutoApplier             │
│ 1. Get session cookies  │
│ 2. Open browser (Ppntr) │
│ 3. Navigate to job page │
│ 4. Fill application     │
│    - Name              │
│    - Email             │
│    - Phone             │
│    - Resume            │
│    - Cover letter      │
│ 5. Submit form         │
│ 6. Wait for confirm    │
└──────────────────────┬──┘
                       │
         ┌─────────────┼──────────┐
         │             │          │
         ▼             ▼          ▼
     Success     Conflict    Timeout
         │          │           │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Application DB   │
         │ Store:           │
         │  - job_id        │
         │  - status        │
         │  - timestamp     │
         │  - response_time │
         └──────────────────┘
```

### Phase 6: Response (MCP → Claude)

```
┌──────────────────────────────────────┐
│ MCP Response JSON                    │
│ {                                    │
│   "status": "success",               │
│   "data": {                          │
│     "jobs_found": 15,                │
│     "auto_applied": 3,               │
│     "needs_review": 5,               │
│     "skipped": 7,                    │
│     "jobs": [                        │
│       {                              │
│         "id": "wanted-12345",        │
│         "title": "iOS Developer",    │
│         "company": "Naver",          │
│         "score": 82,                 │
│         "action": "auto_applied",    │
│         "response_time_ms": 245      │
│       },                             │
│       ...                            │
│     ]                                │
│   },                                 │
│   "timestamp": "2026-02-11T..."      │
│ }                                    │
└──────────────────────────────────────┘
         │
         ▼
      Claude AI
    (Processes response)
```

---

## Service Orchestration Flow

### UnifiedApplySystem Complete Cycle

```
User Initiates: "Apply to all 80+ jobs"
         │
         ▼
┌────────────────────────────────────┐
│ UnifiedApplySystem.applyToAll()    │
└──────────────────────┬─────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    Phase 1       Phase 2         Phase 3
    (Batch)       (Parallel)      (Report)
         │             │             │
    ┌────▼────┐    ┌────▼────┐  ┌────▼────┐
    │  Get    │    │ Apply   │  │  Send   │
    │  Jobs   │    │ Jobs    │  │  Report │
    │  (1-80) │    │ 1-10x   │  │  to     │
    │         │    │ parallel│  │  Slack  │
    └────┬────┘    └────┬────┘  └────┬────┘
         │              │            │
         ▼              ▼            ▼
    Fetch from      Puppeteer     Call Webhook
    Wanted API      Form Fill     POST to
    (15 jobs)       Submit        resume.jclee.me/
                                  webhooks/apply-report
    
    Cache results   Update D1
    in KV           Database
    (1h TTL)        (Stats row)
```

### SessionManager Cookie Lifecycle

```
Session Creation (auth-sync.js)
         │
         ▼
┌─────────────────────────┐
│ Login Flow              │
│ 1. Puppeteer launch     │
│ 2. Navigate to login    │
│ 3. Enter credentials    │
│ 4. Submit form          │
│ 5. Wait for redirect    │
└────────────┬────────────┘
             │
             ▼
┌──────────────────────────────┐
│ SessionManager.save()        │
│ 1. Extract cookies from page │
│ 2. Serialize to JSON         │
│ 3. Write to ~/.opencode/data/│
│    sessions.json             │
│ 4. Set TTL: now + 24h        │
│ 5. Log success (no creds)    │
└────────────┬─────────────────┘
             │
             ▼
    ┌───────────────────┐
    │ Session Storage   │
    │ {                 │
    │   "wanted": {     │
    │     "cookies": [ │
    │       {...}       │
    │     ],            │
    │     "expires_at": │
    │     "2026-02-12"  │
    │   }               │
    │ }                 │
    └─────────┬─────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼ (Within 24h)    ▼ (After 24h)
  Valid            Expired
    │                │
    └─────┬──────────┘
          ▼
    SessionManager.load()
         │
    ┌────▼──────────────────┐
    │ Check TTL             │
    │ If expired:           │
    │  - Log warning        │
    │  - Recommend refresh  │
    │ If valid:             │
    │  - Inject into request│
    │  - Use in crawlers    │
    └───────────────────────┘
```

---

## Browser Automation Flow (AutoApplier)

### Form Submission Sequence

```
Job Found (score >= 75)
         │
         ▼
┌──────────────────────────────┐
│ AutoApplier.submitApplication│
└────────────┬─────────────────┘
             │
    ┌────────▼────────┐
    │ Browser Setup   │
    │ - Launch Chrome │
    │ - Set cookies   │
    │ - Set viewport  │
    └────────┬────────┘
             │
    ┌────────▼──────────────┐
    │ 1. Navigate to Job    │
    │    GET /jobs/12345    │
    │    Response: 200 OK   │
    │    (HTML form)        │
    │ 2. Wait for elements  │
    │    selector check     │
    │    (3s timeout)       │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────────┐
    │ 3. Fill Form Fields        │
    │    - Name: "John Lee"      │
    │    - Email: validate       │
    │    - Phone: normalize      │
    │    - Skills: multi-select  │
    │    - Experience: dropdown  │
    │    - Cover: paste text     │
    │    - Resume: upload file   │
    └────────┬──────────────────┘
             │
    ┌────────▼──────────────┐
    │ 4. Pre-Submit Check    │
    │ - Validate form state  │
    │ - Check for errors     │
    │ - Verify all required  │
    │ - Screenshot (debug)   │
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ 5. Submit Form         │
    │ - Click submit button  │
    │ - Wait for response    │
    │   (5s timeout)         │
    │ - Handle modal/confirm │
    └────────┬──────────────┘
             │
    ┌────────┴──────┬────────────┐
    │               │            │
    ▼               ▼            ▼
 Success         Error      Timeout
    │               │            │
    └───────┬───────┴────────────┘
            │
            ▼
    ┌──────────────────┐
    │ Record Result    │
    │ - job_id         │
    │ - status         │
    │ - duration       │
    │ - error (if any) │
    │ - timestamp      │
    └──────────────────┘
            │
            ▼
    ┌──────────────────────┐
    │ Update ApplicationDB │
    │ INSERT INTO apps... │
    │ WHERE job_id=12345  │
    └──────────────────────┘
```

---

## Worker Data Flow

### Cloudflare Worker Request Cycle

```
External Request
GET /job/api/applications
         │
         ▼
┌──────────────────────────────────┐
│ Worker Entry (workers/src/index) │
│ 1. Parse URL path: /job/api/...  │
│ 2. Strip /job prefix             │
│ 3. Route to handler: /api/...    │
└──────────────┬────────────────────┘
               │
        ┌──────▼──────────┐
        │ Handler Router  │
        │ /api/apps    → │
        │ /api/stats   → │
        │ /api/sync    → │
        │ /api/health  → │
        └──────┬──────────┘
               │
        ┌──────▼──────────────────────┐
        │ Handler: getApplications()  │
        │ 1. Check auth token (header)│
        │ 2. Query D1: job_dashboard  │
        │    SELECT * FROM apps       │
        │    WHERE user_id = ...      │
        │ 3. Aggregate stats          │
        │ 4. Format response          │
        └──────┬──────────────────────┘
               │
        ┌──────▼──────────────────────┐
        │ Database Query (D1)         │
        │ SELECT                      │
        │  job_id, status, timestamp, │
        │  error_msg, duration_ms     │
        │ FROM applications           │
        │ WHERE created_at > now()-7d │
        │ LIMIT 100                   │
        └──────┬──────────────────────┘
               │
        ┌──────▼─────────┐
        │ Results: 47    │
        │ applications   │
        └──────┬─────────┘
               │
        ┌──────▼──────────────────┐
        │ Format JSON Response     │
        │ {                        │
        │   "applications": [      │
        │     {                    │
        │       "job_id": "w-123", │
        │       "status": "success",
        │       "applied_at": "..." │
        │     }                    │
        │   ],                     │
        │   "total": 47,           │
        │   "timestamp": "..."     │
        │ }                        │
        └──────┬──────────────────┘
               │
               ▼
        HTTP 200 OK
        Content-Type: application/json
```

### D1 Database Schema

```
Database: job_dashboard (D1)

┌─────────────────────────────────────┐
│ applications                        │
├─────────────────────────────────────┤
│ id (PK)         INTEGER             │
│ job_id          TEXT (wanted-123)   │
│ job_title       TEXT                │
│ company_name    TEXT                │
│ platform        TEXT (wanted/jk)    │
│ status          TEXT (applied/..)   │
│ match_score     INTEGER (0-100)     │
│ applied_at      TIMESTAMP           │
│ response_time_ms INTEGER            │
│ error_msg       TEXT                │
│ user_id         TEXT                │
│ created_at      TIMESTAMP (default) │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ job_cache                           │
├─────────────────────────────────────┤
│ id (PK)         TEXT (wanted-123)   │
│ job_data        JSON                │
│ fetched_at      TIMESTAMP           │
│ expires_at      TIMESTAMP           │
│ ttl_seconds     INTEGER (3600)      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ sync_logs                           │
├─────────────────────────────────────┤
│ id (PK)         INTEGER             │
│ platform        TEXT (wanted/jk)    │
│ action          TEXT (profile_sync) │
│ changes         JSON                │
│ status          TEXT (success/fail) │
│ timestamp       TIMESTAMP           │
│ error_msg       TEXT                │
└─────────────────────────────────────┘
```

### KV Cache Flow

```
Request to /api/jobs
         │
         ▼
    ┌─────────────────────────┐
    │ Check KV Cache          │
    │ GET "jobs:wanted:list"  │
    └────────────┬────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
    Hit (200)           Miss (404)
        │                  │
    Return            ┌────▼─────────┐
    cached            │ Fetch from   │
    list              │ Wanted API   │
        │              │ Fresh data   │
        │              └────┬────────┘
        │                   │
        │              ┌────▼──────────┐
        │              │ Store in KV   │
        │              │ SET ...       │
        │              │ EX 3600       │
        │              └────┬──────────┘
        │                   │
        └───────┬───────────┘
                │
                ▼
            Return to client
            (X-Cache: HIT/MISS header)
```

---

## Authentication/Session Distribution

### Cross-Platform Session Sync

```
Extract Cookies (all platforms)
         │
         ▼
    ┌─────────────────────┐
    │ extract-cookies-cdp │
    │ Chrome DevTools → 5 │
    │ platform cookies    │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────────────┐
    │ Save Locally                │
    │ ~/.opencode/data/sessions.js│
    │ {                           │
    │   "wanted": {cookies: [...]}│
    │   "jobkorea": {cookies: [.]}│
    │   "remember": {cookies: [...│
    │ }                           │
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Sync to Worker              │
    │ POST /job/api/sync-sessions │
    │ {                           │
    │   "platforms": {wanted: [..]}
    │   "timestamp": now()        │
    │ }                           │
    │ Header: AUTH_SYNC_SECRET    │
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────┐
    │ Worker Validates Auth   │
    │ Check header secret     │
    │ Verify CSRF token       │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────┐
    │ Store in KV             │
    │ KEY: "sessions:wanted"  │
    │ VALUE: {cookies: [...]} │
    │ EX: 24h                 │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Confirm Success             │
    │ HTTP 200 OK                 │
    │ {                           │
    │   "status": "synced",       │
    │   "platforms": 5,           │
    │   "valid_until": "2026-..." │
    │ }                           │
    └─────────────────────────────┘
```

---

## Webhook/Event Flow

### Application Result Notification

```
Application Submitted
         │
         ▼
┌───────────────────────────┐
│ AutoApplier completes     │
│ status = "success" OR     │
│ status = "error"          │
└────────────┬──────────────┘
             │
    ┌────────▼────────────────┐
    │ Record in D1            │
    │ INSERT applications     │
    │ VALUES(job_id, status..)
    └────────┬────────────────┘
             │
    ┌────────▼────────────────────┐
    │ Check Notification Config   │
    │ IF slack_webhook_enabled    │
    │ AND (error OR score >= 85)  │
    └────────┬────────────────────┘
             │
    ┌────────▼───────────────────────┐
    │ POST to Slack Webhook           │
    │ https://hooks.slack.com/...     │
    │ {                              │
    │   "text": "Applied to iOS Dev" │
    │   "blocks": [                  │
    │     {                          │
    │       "type": "section",       │
    │       "text": {job_title...}   │
    │     }                          │
    │   ],                           │
    │   "job_id": "wanted-123",      │
    │   "company": "Naver",          │
    │   "score": 87                  │
    │ }                              │
    └────────┬───────────────────────┘
             │
         (async, fire-and-forget)
             │
    ┌────────▼────────────────┐
    │ Slack Receives          │
    │ Posts in #job-automation│
    │ With job details        │
    └─────────────────────────┘
```

### Daily Report Workflow (Cloudflare)

```
Daily Report Trigger (9 AM UTC, cron)
         │
         ▼
┌──────────────────────────┐
│ Cloudflare Workflow:     │
│ DailyReportWorkflow      │
└──────────┬───────────────┘
           │
    ┌──────▼──────────────────┐
    │ Step 1: Query Statistics│
    │ SELECT COUNT(*), status │
    │ FROM applications       │
    │ WHERE DATE(created_at)  │
    │ = TODAY                 │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ Step 2: Format Report   │
    │ {                       │
    │   "total_applied": 15,  │
    │   "successful": 12,     │
    │   "failed": 3,          │
    │   "avg_match_score": 78 │
    │ }                       │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ Step 3: Post to Slack   │
    │ POST webhooks/report    │
    │ (fire-and-forget)       │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ Step 4: Log to Database │
    │ INSERT sync_logs        │
    │ (audit trail)           │
    └──────────────────────────┘
```

---

## Error Handling and Resilience

### Error Recovery Flow

```
Error Occurs (any layer)
         │
         ▼
    ┌──────────────────┐
    │ Error Handler    │
    │ 1. Classify:     │
    │    - Network     │
    │    - Timeout     │
    │    - Auth        │
    │    - Parse       │
    │    - Business    │
    └────────┬─────────┘
             │
    ┌────────┴──────────────────────────┐
    │                                   │
    ▼ (Retryable)              ▼ (Fatal)
    
    ┌──────────────────┐    ┌──────────────────┐
    │ Exponential      │    │ Log Error (ECS)  │
    │ Backoff:         │    │ No sensitive data│
    │ 2s → 4s → 8s    │    │ Domain-specific  │
    │                 │    │ error message    │
    └────────┬────────┘    └────────┬─────────┘
             │                      │
    ┌────────▼────────────┐    ┌────▼──────┐
    │ Retry up to 3x      │    │ Notify    │
    │ If success: done    │    │ Slack     │
    │ If fail: → Fatal    │    │ (Webhook) │
    └────────┬────────────┘    └────┬──────┘
             │                      │
             └──────────┬───────────┘
                        │
                        ▼
                ┌──────────────────┐
                │ Track in Metrics │
                │ error_count++    │
                │ Export to Prom   │
                └──────────────────┘
```

---

## Performance Characteristics

| Operation | Duration | Bottleneck | Cache |
|-----------|----------|-----------|-------|
| Fetch jobs | 500-800ms | Wanted API | KV (1h) |
| Score jobs (Tier 1) | 50-100ms | CPU (local) | Memory |
| Score jobs (Tier 2) | 2-5s | Claude API | None |
| Auto-apply (one job) | 10-20s | Form fill + submit | None |
| Sync profile (all 3) | 30-60s | Browser nav + submit | None |
| Extract cookies (CDP) | 3-5s | Chrome DevTools | None |

---

## Data Consistency Guarantees

| Component | Consistency | Mechanism |
|-----------|-------------|-----------|
| Session cookies | Per-platform | 24h TTL, immutable |
| D1 applications | Transaction | SQL ACID properties |
| KV cache | Eventual | TTL-based invalidation |
| Job cache | LRU | KV with 1h TTL |
| MCP response | Request | Sent with request ID |

