# Architecture Diagrams

Visual representations of the job-automation workers system, request flows, and
component interactions.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Request Flow Sequence](#request-flow-sequence)
3. [Workflow Execution Timeline](#workflow-execution-timeline)
4. [Authentication Flow](#authentication-flow)
5. [Rate Limiting Algorithm](#rate-limiting-algorithm)

---

## System Architecture

High-level overview of all major components and their relationships:

#### Diagram summary 1

- Type: flowchart
- Component: 🌐 Browser (Browser)
- Component: 🔧 MCP Server (MCP)
- Component: 💻 CLI Tool (CLI)
- Component: Fetch Handler (Fetch)
- Component: Middleware Stack / 7 Layers (Middleware)
- Component: Router / 30+ Endpoints (Router)
- Component: Handler Classes / 8 Handlers (Handlers)
- Component: AuthService (Auth)
- Component: StatsService (Stats)
- Component: ApplicationsService (Apps)
- Component: WorkflowService (Workflows)
- Component: 📊 D1 Database / 3 Tables (D1)
- Component: ⚡ KV Storage / 3 Namespaces (KV)
- Component: 📦 R2 Bucket / Screenshots (R2)
- Component: 🔔 Slack Notifications (Slack)
- Component: ☁️ Cloudflare API (CF)
- Component: 🪝 Webhooks (Webhooks)
- 🌐 Browser (Browser) -> Fetch Handler (Fetch)
- 🔧 MCP Server (MCP) -> Fetch Handler (Fetch)
- 💻 CLI Tool (CLI) -> Fetch Handler (Fetch)
- Fetch Handler (Fetch) -> Middleware Stack / 7 Layers (Middleware)
- Middleware Stack / 7 Layers (Middleware) -> Router / 30+ Endpoints (Router)
- Router / 30+ Endpoints (Router) -> Handler Classes / 8 Handlers (Handlers)
- Handler Classes / 8 Handlers (Handlers) -> AuthService (Auth)
- Handler Classes / 8 Handlers (Handlers) -> StatsService (Stats)
- Handler Classes / 8 Handlers (Handlers) -> ApplicationsService (Apps)
- Handler Classes / 8 Handlers (Handlers) -> WorkflowService (Workflows)
- AuthService (Auth) -> ⚡ KV Storage / 3 Namespaces (KV)
- AuthService (Auth) -> 📊 D1 Database / 3 Tables (D1)
- StatsService (Stats) -> 📊 D1 Database / 3 Tables (D1)
- ApplicationsService (Apps) -> 📊 D1 Database / 3 Tables (D1)
- ApplicationsService (Apps) -> 📦 R2 Bucket / Screenshots (R2)
- WorkflowService (Workflows) -> 🔔 Slack Notifications (Slack)
- WorkflowService (Workflows) -> ☁️ Cloudflare API (CF)
- 🌐 Browser (Browser) -> 🪝 Webhooks (Webhooks)

### Component Descriptions

**Client Layer**:

- **Browser**: Frontend dashboard accessing `/job/*` routes
- **MCP Server**: Tool interface for job application automation
- **CLI Tool**: Command-line deployment and management

**Cloudflare Worker**:

- **Fetch Handler**: Entry point, strips `/job` prefix, dispatches to routing
- **Middleware Stack**: 7 layers (logger, CORS, rate limit, CSRF, auth, handler,
  response)
- **Router**: Maps 30+ API endpoints to appropriate handlers
- **Handler Classes**: 8 handler classes (Applications, Auth, Stats, Webhooks,
  etc.)

**Service Layer**:

- **AuthService**: JWT generation, token validation, session management
- **StatsService**: Statistics aggregation, report generation
- **ApplicationsService**: Job application CRUD operations
- **WorkflowService**: Workflow triggering and monitoring

**Storage**:

- **D1 Database**: applications, job_cache, sync_logs tables
- **KV Storage**: SESSIONS (24h TTL), RATE_LIMIT_KV (60s TTL), NONCE_KV (24h
  TTL)
- **R2 Bucket**: Screenshot storage for job listings

**External Services**:

- **Slack**: Error notifications, status reports
- **Cloudflare API**: Direct API access for advanced operations
- **Webhooks**: Outbound notifications for external integrations

---

## Request Flow Sequence

Detailed sequence diagram showing how a request flows through the entire system:

#### Diagram summary 2

- Type: sequence
- Participant: Client as 🌐 Client
- Participant: Fetch as Fetch Handler
- Participant: Logger as Logger Middleware
- Participant: CORS as CORS Middleware
- Participant: RateLimit as Rate Limit
- Participant: Auth as Auth Middleware
- Participant: Handler as Handler Instance
- Participant: Service as Service Layer
- Participant: Database as D1 Database
- Participant: Response as Response Logger
- Client -> Fetch: HTTP Request / /job/api/applications
- Fetch -> Fetch: Strip /job prefix / /api/applications
- Fetch -> Logger: Pass request
- Logger -> Logger: Log request (ECS format)
- Logger -> CORS: Continue
- CORS -> CORS: Validate origin / Add CORS headers
- CORS -> RateLimit: Continue
- RateLimit -> RateLimit: Check token bucket / IP: 203.0.113.42
- RateLimit -> RateLimit: Decrement token count / 59/60 remaining
- RateLimit -> Auth: Continue (if tokens available)
- Auth -> Auth: Extract Bearer token / from Authorization header
- Auth -> Auth: Validate JWT signature / Check expiration (24h)
- Auth -> Handler: Continue (if valid)
- Handler -> Handler: Parse request body / Validate schema
- Handler -> Service: Call getApplications(page=1)
- Service -> Database: SELECT FROM applications / LIMIT 50 OFFSET 0
- Database -> Database: Query execution / 4.5ms
- Database -> Service: Return 42 rows
- Service -> Service: Format response / Add pagination metadata
- Service -> Handler: Return results
- Handler -> Handler: Build response JSON
- Handler -> Response: Pass response
- Response -> Response: Log response (ECS format) / Status: 200 / Duration: 12ms / Size: 8.2KB
- Response -> Client: HTTP 200 OK / Content-Type: application/json / Access-Control-Allow-Origin:
- Client -> Client: Parse JSON / Render UI

### Key Points

1. **Request Transformation**: `/job/api/applications` → `/api/applications`
2. **Middleware Chain**: Each layer can reject or modify the request
3. **Token Bucket**: Rate limiting uses token-per-second refill (60 req/min = 1
   token/sec)
4. **JWT Validation**: Tokens expire after 24 hours, require refresh
5. **ECS Logging**: All logs include @timestamp, duration, status, response size
6. **Database Query**: Average 4-5ms per query (simple SELECT)

---

## Workflow Execution Timeline

Sequence of events during a scheduled or triggered workflow:

#### Diagram summary 3

- Type: timeline
- Component: 0 9 (Report)
- 09: 00 UTC : Event trigger fires
- 09: 00:100ms : Workflow instance created
- 09: 00:200ms : Load workflow definition
- 09: 00:300ms : Authenticate workflow
- 09: 00:400ms : Step 1 - Fetch statistics
- Component: SELECT COUNT (D1)
- Component: 600ms (complete)
- 09: 00:700ms : Step 2 - Format report
- 09: 00:800ms : Process template
- 09: 00:900ms : Step 3 - Send Slack notification
- 09: 01:100ms : Call Slack API
- 09: 01:500ms : Store execution record
- 09: 01:600ms : Workflow success
- Component: ECS format (completion)
- Component: if failure (Handling)
- 09: 02:000ms : Catch error handler
- 09: 02:100ms : Send error notification
- 09: 02:500ms : Workflow failed

### Timeline Breakdown

**Schedule Phase** (300ms):

- Workflow trigger fires at scheduled time
- Workflow infrastructure initializes
- Authentication tokens validated

**Execution Phase 1** (200ms):

- Fetch statistics from D1
- Count applications by status
- Calculate totals and percentages

**Execution Phase 2** (200ms):

- Format data into report template
- Add charts/graphs (if applicable)
- Prepare for transmission

**Execution Phase 3** (600ms):

- Call Slack API webhook
- Slack server processes message
- Confirm delivery (200ms, mostly network latency)

**Completion Phase** (200ms):

- Store execution record in D1
- Log success event
- Update workflow status

**Error Handling** (varies):

- If any step fails, catch handler triggers
- Send error notification to Slack
- Mark workflow as failed
- Log full error details

---

## Authentication Flow

Complete authentication and session lifecycle:

#### Diagram summary 4

- Type: flowchart
- 🔐 Authentication Start (Start) -> Cookie / Present? (CheckCookie)
- Cookie / Present? (CheckCookie) -> JWT / Valid? (ValidateCookie)
- Cookie / Present? (CheckCookie) -> Redirect to / /api/auth/login (Login)
- JWT / Valid? (ValidateCookie) -> Token / Expiring / Soon? (CheckExpiration)
- JWT / Valid? (ValidateCookie) -> Clear invalid / session (ClearSession)
- Clear invalid / session (ClearSession) -> Redirect to / /api/auth/login (Login)
- Token / Expiring / Soon? (CheckExpiration) -> Call refresh endpoint / /api/auth/refresh (Refresh)
- Token / Expiring / Soon? (CheckExpiration) -> ✅ Authenticated (Authenticated)
- Call refresh endpoint / /api/auth/refresh (Refresh) -> Generate new JWT / exp: now + 24h (GenerateNewToken)
- Generate new JWT / exp: now + 24h (GenerateNewToken) -> Store in KV / SESSIONS namespace / TTL: 24h (StoreSession)
- Store in KV / SESSIONS namespace / TTL: 24h (StoreSession) -> Set HTTP-only cookie / secure, SameSite=Strict (SetCookie)
- Set HTTP-only cookie / secure, SameSite=Strict (SetCookie) -> ✅ Authenticated (Authenticated)
- Redirect to / /api/auth/login (Login) -> User enters / username/password (EnterCreds)
- User enters / username/password (EnterCreds) -> Hash password / bcrypt (HashPassword)
- Hash password / bcrypt (HashPassword) -> Hash / Match? (VerifyHash)
- Hash / Match? (VerifyHash) -> ❌ Unauthorized / 401 (ErrorAuth)
- Hash / Match? (VerifyHash) -> Generate JWT / payload: {user, exp} (GenerateToken)
- Generate JWT / payload: {user, exp} (GenerateToken) -> Sign with / JWTSECRET (SignToken)
- Sign with / JWTSECRET (SignToken) -> Store in KV / SESSIONS namespace / TTL: 24h (StoreSession)
- ✅ Authenticated (Authenticated) -> ✅ Access API / Send Authorization header (AccessAPI)
- ❌ Unauthorized / 401 (ErrorAuth) -> Clear invalid / session (ClearSession)

### Authentication Details

**Session Storage** (KV):

- Key: `session:{user_id}:{random_token}`
- Value: `{user_id, username, roles, created_at, expires_at}`
- TTL: 24 hours (auto-expiration)
- Location: `SESSIONS` KV namespace

**JWT Token**:

- Payload: `{user_id, username, roles, iat, exp}`
- Signature Algorithm: HS256 (HMAC-SHA256)
- Secret: `env.JWT_SECRET` (stored securely)
- Expiration: 24 hours from issue

**Cookie Settings**:

- Name: `session_token`
- HttpOnly: true (JavaScript cannot access)
- Secure: true (HTTPS only)
- SameSite: Strict (prevent CSRF)
- Path: `/job/*`
- Domain: `resume.jclee.me`

**Refresh Flow**:

- Client checks token expiration
- If expiring within 1 hour, calls `/api/auth/refresh`
- Server validates old token and issues new one
- New token stored in both KV and cookie

---

## Rate Limiting Algorithm

Token bucket algorithm for rate limiting (60 requests/minute per IP):

#### Diagram summary 5

- Type: flowchart
- 📥 Request arrives / Client IP: 203.0.113.42 (Request) -> Calculate KV key / rate-limit:203.0.113.42 (CalculateKey)
- Calculate KV key / rate-limit:203.0.113.42 (CalculateKey) -> KV entry / exists? (CheckKV)
- KV entry / exists? (CheckKV) -> Initialize bucket / tokens: 60 / lastrefill: now (Initialize)
- Initialize bucket / tokens: 60 / lastrefill: now (Initialize) -> Store in KV / TTL: 60 seconds (AddEntry)
- Store in KV / TTL: 60 seconds (AddEntry) -> tokens > 0? (HasTokens)
- KV entry / exists? (CheckKV) -> Retrieve from KV / tokens: X / lastrefill: T (Retrieve)
- Retrieve from KV / tokens: X / lastrefill: T (Retrieve) -> Calculate time elapsed / since lastrefill (CalculateRefill)
- Calculate time elapsed / since lastrefill (CalculateRefill) -> Refill tokens / +1 token/second / max: 60 (RefillTokens)
- Refill tokens / +1 token/second / max: 60 (RefillTokens) -> tokens > 0? (HasTokens)
- tokens > 0? (HasTokens) -> Decrement by 1 / tokens: X - 1 (Decrement)
- Decrement by 1 / tokens: X - 1 (Decrement) -> Update KV entry / Store new state (Update)
- Update KV entry / Store new state (Update) -> ✅ Allow request / X-RateLimit-Remaining: X-1 (AllowRequest)
- tokens > 0? (HasTokens) -> ❌ Reject request / HTTP 429 / Retry-After: 60 (Deny)
- ❌ Reject request / HTTP 429 / Retry-After: 60 (Deny) -> Clear from KV / when TTL expires / or manually (ClearAfterTTL)

### Rate Limiting Details

**Token Bucket Algorithm**:

- **Capacity**: 60 tokens (60 requests/minute)
- **Refill Rate**: 1 token per second
- **Cost per Request**: 1 token
- **Reset**: Automatic after 60 seconds (TTL in KV)

**KV Storage**:

- **Key**: `rate-limit:{client_ip}`
- **Value**: `{tokens: number, last_refill: timestamp}`
- **TTL**: 60 seconds (expires after 60s inactivity)
- **Namespace**: `RATE_LIMIT_KV`

**Example Timeline** (60-second window):

| Time  | Event             | Tokens                     | Status          |
| ----- | ----------------- | -------------------------- | --------------- |
| 0s    | Initial request   | 60                         | ✅ Allow        |
| 0.1s  | Request 2         | 59                         | ✅ Allow        |
| 0.2s  | Request 3         | 58                         | ✅ Allow        |
| ...   | ...               | ...                        | ...             |
| 50s   | Request 50        | 10                         | ✅ Allow        |
| 60s   | Bucket refills    | 10 + 60 = 70 → 60 (capped) | ✅ Allow        |
| 60.5s | Request 51        | 59                         | ✅ Allow        |
| Burst | 61 requests in 1s | 0                          | ❌ Reject (429) |

**Response Headers**:

```text
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1708000060
```

**When Limit Exceeded** (429 Too Many Requests):

```text
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "error": "rate_limit_exceeded",
  "limit": 60,
  "window": "60 seconds",
  "retry_after": 60
}
```

---

## Integration Points

### How Components Interact

1. **Request → Middleware → Handler → Service → Database**
   - Each layer is independent
   - Services are stateless (no instance variables)
   - Database operations are batched when possible

2. **Authentication → Sessions (KV)**
   - JWT tokens stored in KV with TTL
   - Auto-refresh on expiration
   - Cookie fallback for browser clients

3. **Rate Limiting → KV Storage**
   - Per-IP tracking in `RATE_LIMIT_KV`
   - 60-second TTL prevents storage bloat
   - Token bucket algorithm for fair distribution

4. **Workflows → D1 + Slack**
   - Query statistics from D1
   - Send notifications to Slack
   - Store logs in D1 for audit trail

5. **Screenshots → R2**
   - Job crawler stores screenshots
   - Referenced in applications table
   - Organized by date/platform

---

## Performance Characteristics

### Typical Response Times

| Operation            | Time  | Bottleneck |
| -------------------- | ----- | ---------- |
| Rate limit check     | 5ms   | KV read    |
| JWT validation       | 2ms   | Crypto     |
| Single row query     | 4ms   | D1 network |
| Multi-row query (50) | 15ms  | D1 network |
| Slack notification   | 600ms | Slack API  |
| Full request cycle   | 12ms  | D1 query   |

### Throughput Limits

- **Max concurrent requests**: Unlimited (Cloudflare infrastructure)
- **Rate limit**: 60 per minute per IP (configurable)
- **KV operations**: 1000s per second (minimal latency)
- **D1 database**: 100+ concurrent connections
- **R2 uploads**: 10Gbps+ per bucket

---

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Request Rate** (requests/minute)
   - Normal: 5-10 req/min
   - Alert: >50 req/min or 0 req/5min

2. **Error Rate** (errors/minute)
   - Normal: 0%
   - Alert: >5% or 10+ errors/min

3. **Response Time** (p50, p95, p99)
   - Normal: p50 <50ms, p99 <200ms
   - Alert: p99 >500ms

4. **Rate Limit Hits** (429 responses)
   - Normal: 0
   - Alert: >1 per day

5. **Database Operations**
   - Normal: <20ms/query
   - Alert: >100ms/query

---

## References

- See [AGENTS.md](./AGENTS.md) for implementation details
- See [API_REFERENCE.md](./API_REFERENCE.md) for endpoint specifications
- See [README.md](./README.md) for quick start
- See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for deployment instructions
- See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for local development
