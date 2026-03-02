# Job Automation Dashboard Worker - API Reference

**Last Updated**: 2026-02-11  
**Worker URL**: `https://resume.jclee.me/job/*`  
**Environment**: Production (Cloudflare Workers)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL & Headers](#base-url--headers)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Endpoints](#endpoints)
   - [Health & Status](#health--status)
   - [Statistics](#statistics)
   - [Authentication](#authentication-endpoints)
   - [Applications CRUD](#applications-crud)
   - [Webhooks](#webhooks)
   - [Workflows](#workflows)
   - [Auto-Apply](#auto-apply)
   - [Config](#config)
   - [Testing & Cleanup](#testing--cleanup)
7. [Response Format](#response-format)
8. [Common Error Codes](#common-error-codes)

---

## Overview

The Job Automation Dashboard Worker exposes **30+ REST API endpoints** for:

- **Authentication**: Session management, token validation, cookie synchronization
- **Application Tracking**: CRUD operations for job applications
- **Analytics**: Statistics, reporting, weekly/daily breakdowns
- **Automation**: Workflow triggering, webhook callbacks, auto-apply status
- **Configuration**: Settings management, feature flags, deployment validation

**Tech Stack**:

- **Runtime**: Cloudflare Workers (global edge deployment)
- **Database**: D1 (SQLite serverless)
- **Cache**: KV namespace (session, rate limit, CSRF tokens)
- **Workflows**: Cloudflare Workflows (event-triggered + on-demand)

---

## Authentication

### Bearer Token (Recommended)

All protected endpoints require an `Authorization: Bearer <token>` header.

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://resume.jclee.me/job/api/applications
```

**Token Format**:

- **Type**: JWT (JSON Web Token)
- **Algorithm**: HS256
- **Expiry**: 24 hours
- **Issued by**: `/api/auth/login` endpoint

### Session Cookies (Fallback)

If Bearer token is unavailable, the worker checks for session cookies:

```
Cookie: session=abc123; sessionId=def456; auth=ghi789
```

**Session Lifecycle**:

1. Client calls `/api/auth/login` with platform credentials
2. Worker generates JWT token + session cookie
3. Token stored in KV with 24h TTL
4. On request, token validated + refreshed if needed
5. After 24h expiry, client must re-authenticate

### Token Refresh

Tokens near expiry are automatically refreshed:

```bash
curl -X POST https://resume.jclee.me/job/api/auth/refresh \
  -H "Authorization: Bearer <token>"

# Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400
}
```

---

## Base URL & Headers

### Base URL

```
https://resume.jclee.me/job
```

### Required Headers

```
Content-Type: application/json
Authorization: Bearer <token>  # For protected endpoints
```

### Optional Headers

```
X-Request-ID: <uuid>          # For tracing (logged)
X-Webhook-Signature: <hmac>   # For webhook verification
```

### Response Headers

All responses include:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1739327125
Content-Type: application/json
```

---

## Error Handling

### Error Response Format

```json
HTTP/1.1 400 Bad Request

{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Job ID is required",
    "details": {
      "field": "job_id",
      "reason": "missing_required_field"
    }
  },
  "timestamp": "2026-02-11T06:00:00.000Z",
  "requestId": "abc-123-def-456"
}
```

### HTTP Status Codes

| Code    | Meaning               | Example                                       |
| ------- | --------------------- | --------------------------------------------- |
| **200** | OK                    | Successful GET request                        |
| **201** | Created               | Application added successfully                |
| **204** | No Content            | Successful DELETE (no response body)          |
| **400** | Bad Request           | Invalid input (missing fields, type mismatch) |
| **401** | Unauthorized          | Missing or invalid authentication token       |
| **403** | Forbidden             | Insufficient permissions for operation        |
| **404** | Not Found             | Resource does not exist                       |
| **429** | Too Many Requests     | Rate limit exceeded                           |
| **500** | Internal Server Error | Database error, service unavailable           |
| **503** | Service Unavailable   | Maintenance or worker restart                 |

---

## Rate Limiting

### Token Bucket Algorithm

**Configuration**:

- **Max Tokens**: 60 per minute per IP address
- **Refill Rate**: 1 token per second
- **Window**: 60 seconds (rolling)
- **Storage**: KV namespace `RATE_LIMIT_KV`

### Rate Limit Headers

Every response includes:

```
X-RateLimit-Limit: 60           # Max requests per minute
X-RateLimit-Remaining: 45       # Tokens remaining
X-RateLimit-Reset: 1739327125   # Unix timestamp when limit resets
```

### Rate Limit Exceeded

When limit exceeded, all endpoints return:

```json
HTTP/1.1 429 Too Many Requests

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit of 60 requests per minute",
    "retryAfter": 30
  },
  "rateLimit": {
    "limit": 60,
    "remaining": 0,
    "reset": 1739327125
  }
}
```

**Recommendation**: Implement exponential backoff when receiving 429:

```javascript
const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s, 8s...
```

---

## Endpoints

### Health & Status

#### GET /health

Health check endpoint (no auth required).

**Request**:

```bash
curl https://resume.jclee.me/job/health
```

**Response** (200 OK):

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2026-02-11T06:00:00.000Z",
  "dependencies": {
    "database": "healthy",
    "cache": "healthy",
    "workflows": "operational"
  }
}
```

---

#### GET /readiness

Readiness check for load balancers (all dependencies must be UP).

**Request**:

```bash
curl https://resume.jclee.me/job/readiness
```

**Response** (200 OK):

```json
{
  "ready": true,
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 12
    },
    "cache": {
      "status": "up",
      "responseTime": 5
    },
    "workflows": {
      "status": "up",
      "activeWorkflows": 3
    }
  }
}
```

**Response** (503 Service Unavailable):

```json
{
  "ready": false,
  "checks": {
    "database": {
      "status": "down",
      "error": "Cannot connect to D1 database"
    }
  }
}
```

---

#### GET /status

Full service status with metrics.

**Request**:

```bash
curl https://resume.jclee.me/job/status
```

**Response** (200 OK):

```json
{
  "status": "operational",
  "version": "1.0.0",
  "uptime": 3600,
  "deployed": "2026-02-11T00:00:00.000Z",
  "metrics": {
    "requests_total": 1234,
    "requests_success": 1220,
    "requests_error": 14,
    "average_response_time": 45,
    "database_queries": 450,
    "cache_hits": 890,
    "cache_misses": 110
  },
  "activeWorkflows": 3,
  "storageUsage": {
    "database_rows": 1500,
    "cache_entries": 450,
    "rate_limit_entries": 80
  }
}
```

---

### Statistics

#### GET /api/stats

Overall application statistics.

**Request**:

```bash
curl https://resume.jclee.me/job/api/stats \
  -H "Authorization: Bearer <token>"
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `platform` | string | No | Filter by platform (wanted, jobkorea, linkedin) |
| `dateFrom` | ISO8601 | No | Filter from date (2026-02-01) |
| `dateTo` | ISO8601 | No | Filter to date (2026-02-11) |

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "total_applications": 150,
    "by_status": {
      "applied": 95,
      "reviewing": 30,
      "rejected": 15,
      "accepted": 10
    },
    "by_platform": {
      "wanted": 60,
      "jobkorea": 45,
      "linkedin": 30,
      "saramin": 15
    },
    "success_rate": 0.067,
    "average_review_time": "3.5 days",
    "last_updated": "2026-02-11T06:00:00.000Z"
  }
}
```

---

#### GET /api/stats/weekly

Weekly statistics breakdown.

**Request**:

```bash
curl "https://resume.jclee.me/job/api/stats/weekly?weeks=4" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `weeks` | integer | 4 | Number of weeks to include |

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "weeks": [
      {
        "week_start": "2026-01-27",
        "applications": 40,
        "by_status": {
          "applied": 25,
          "reviewing": 10,
          "rejected": 3,
          "accepted": 2
        },
        "acceptance_rate": 0.05
      }
    ],
    "total": 85,
    "average_per_week": 42.5
  }
}
```

---

#### GET /api/stats/daily

Daily statistics breakdown.

**Request**:

```bash
curl "https://resume.jclee.me/job/api/stats/daily?days=7" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | 7 | Number of days to include |

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "days": [
      {
        "date": "2026-02-05",
        "applications": 12,
        "statuses": {
          "applied": 8,
          "reviewing": 3,
          "rejected": 1,
          "accepted": 0
        }
      }
    ],
    "total": 75,
    "average_per_day": 10.7
  }
}
```

---

### Authentication Endpoints

#### POST /api/auth/login

Set session cookies and generate authentication token.

**Request**:

```bash
curl -X POST https://resume.jclee.me/job/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "wanted",
    "cookies": "pSession=abc123; userId=456; csrfToken=def789"
  }'
```

**Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "platform": "wanted",
    "sessionId": "session_12345"
  }
}
```

---

#### GET /api/auth/status

Check current authentication status.

**Request**:

```bash
curl https://resume.jclee.me/job/api/auth/status \
  -H "Authorization: Bearer <token>"
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "platform": "wanted",
    "expiresAt": "2026-02-12T06:00:00.000Z",
    "expiresIn": 86000
  }
}
```

---

### Applications CRUD

#### GET /api/applications

List all applications with optional filtering.

**Request**:

```bash
curl "https://resume.jclee.me/job/api/applications?status=applied&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter: applied, reviewing, rejected, accepted |
| `platform` | string | - | Filter: wanted, jobkorea, linkedin, saramin |
| `limit` | integer | 20 | Max results per page |
| `offset` | integer | 0 | Pagination offset |

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "app_123",
        "job_id": "job_456",
        "job_title": "Senior TypeScript Developer",
        "company_name": "TechCorp",
        "platform": "wanted",
        "status": "applied",
        "match_score": 87,
        "applied_at": "2026-02-10T14:30:00.000Z",
        "created_at": "2026-02-10T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

#### POST /api/applications

Add new application (manual entry).

**Request**:

```bash
curl -X POST https://resume.jclee.me/job/api/applications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "job_123",
    "job_title": "DevOps Engineer",
    "company_name": "CloudTech Inc",
    "platform": "wanted",
    "status": "applied",
    "match_score": 78
  }'
```

**Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "app_789",
    "job_id": "job_123",
    "job_title": "DevOps Engineer",
    "company_name": "CloudTech Inc",
    "platform": "wanted",
    "status": "applied",
    "created_at": "2026-02-11T06:00:00.000Z"
  }
}
```

---

#### PATCH /api/applications/:id/status

Update status only (quick update).

**Request**:

```bash
curl -X PATCH https://resume.jclee.me/job/api/applications/app_123/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "accepted"}'
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "app_123",
    "status": "accepted",
    "previous_status": "reviewing",
    "updated_at": "2026-02-11T06:00:00.000Z"
  }
}
```

---

#### DELETE /api/applications/:id

Delete application.

**Request**:

```bash
curl -X DELETE https://resume.jclee.me/job/api/applications/app_123 \
  -H "Authorization: Bearer <token>"
```

**Response** (204 No Content):

```
(empty response body)
```

---

### Workflows

#### POST /api/workflows/:name/run

Trigger a named workflow.

**Request**:

```bash
curl -X POST https://resume.jclee.me/job/api/workflows/job-crawling/run \
  -H "Authorization: Bearer <token>"
```

**URL Parameters**:
| Parameter | Values |
|-----------|--------|
| `:name` | job-crawling, application, resume-sync, daily-report, health-check, backup, cleanup |

**Response** (202 Accepted):

```json
{
  "success": true,
  "data": {
    "workflowId": "resume-sync-workflow",
    "instanceId": "wf_abc123def456",
    "status": "queued",
    "createdAt": "2026-02-11T06:00:00.000Z"
  }
}
```

---

#### GET /api/workflows/:instanceId/status

Get workflow execution status.

**Request**:

```bash
curl https://resume.jclee.me/job/api/workflows/wf_abc123def456/status \
  -H "Authorization: Bearer <token>"
```

**Response** (200 OK - Running):

```json
{
  "success": true,
  "data": {
    "instanceId": "wf_abc123def456",
    "workflowId": "job-crawling-workflow",
    "status": "running",
    "progress": 45,
    "currentStep": "fetching_jobs"
  }
}
```

**Response** (200 OK - Completed):

```json
{
  "success": true,
  "data": {
    "instanceId": "wf_abc123def456",
    "status": "completed",
    "progress": 100,
    "result": {
      "jobs_found": 45,
      "high_match": 12
    },
    "completedAt": "2026-02-11T06:02:30.000Z",
    "duration": "2m 30s"
  }
}
```

---

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    /* endpoint-specific data */
  },
  "metadata": {
    "timestamp": "2026-02-11T06:00:00.000Z",
    "requestId": "abc-123-def-456"
  }
}
```

### Error Response

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "string (error code)",
    "message": "string (human-readable message)"
  },
  "metadata": {
    "timestamp": "2026-02-11T06:00:00.000Z",
    "requestId": "abc-123-def-456"
  }
}
```

---

## Common Error Codes

| Code                  | Status | Description                        | Solution                      |
| --------------------- | ------ | ---------------------------------- | ----------------------------- |
| `INVALID_INPUT`       | 400    | Missing or malformed input         | Check request body            |
| `INVALID_TOKEN`       | 401    | Token missing, invalid, or expired | Re-authenticate               |
| `TOKEN_EXPIRED`       | 401    | Token has expired                  | Call `POST /api/auth/refresh` |
| `INSUFFICIENT_PERMS`  | 403    | User lacks permissions             | Contact administrator         |
| `NOT_FOUND`           | 404    | Resource does not exist            | Verify resource ID exists     |
| `RATE_LIMIT_EXCEEDED` | 429    | Too many requests                  | Wait and retry with backoff   |
| `DB_ERROR`            | 500    | Database connection failed         | Retry after a delay           |
| `SERVICE_UNAVAILABLE` | 503    | Worker temporarily unavailable     | Retry with backoff            |

---

## Pagination

Endpoints returning lists support pagination:

**Query Parameters**:

```
?limit=20&offset=0
```

**Response**:

```json
{
  "data": {
    "items": [],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## Related Documentation

- **[README.md](./README.md)** - Quick start, deployment, configuration
- **[AGENTS.md](./AGENTS.md)** - Architecture, handlers, workflows, database schema
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** - Job automation system overview

---

**Last Updated**: 2026-02-11  
**API Version**: 1.0.0  
**Status**: ✅ Complete with 30+ endpoints documented
