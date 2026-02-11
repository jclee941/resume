# Development Guide

Complete guide for local development, testing, debugging, and extending the job-automation dashboard worker.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Local Development](#local-development)
4. [Testing](#testing)
5. [Adding New Endpoints](#adding-new-endpoints)
6. [Adding New Handlers](#adding-new-handlers)
7. [Adding Middleware](#adding-middleware)
8. [Database Changes](#database-changes)
9. [KV Operations](#kv-operations)
10. [Unit Testing](#unit-testing)
11. [Integration Testing](#integration-testing)
12. [Debugging](#debugging)
13. [Performance Profiling](#performance-profiling)
14. [Workflow Development](#workflow-development)
15. [IDE Setup](#ide-setup)
16. [Common Development Tasks](#common-development-tasks)
17. [Troubleshooting](#troubleshooting)
18. [Best Practices](#best-practices)

---

## Prerequisites

### System Requirements

- **Node.js** 18.0.0 or higher (LTS)
  ```bash
  node --version
  npm --version  # Should be 8.0.0+
  ```

- **Git** 2.30.0 or higher
  ```bash
  git --version
  ```

- **Wrangler CLI** 3.0.0 or higher
  ```bash
  npm install -g wrangler@latest
  wrangler --version
  ```

### IDE Requirements

- **Visual Studio Code** (recommended) OR any TypeScript-capable editor
- **TypeScript** 5.0.0 or higher (in project dependencies)
- **ESLint** (linter, in project dependencies)

### Optional Tools

- **curl** or **Postman** for API testing
- **SQLite CLI** for database inspection
  ```bash
  sqlite3 --version
  ```

---

## Project Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/jclee/resume.git
cd resume

# Or if already cloned, ensure you're on master
git checkout master
git pull origin master
```

### Step 2: Install Dependencies

```bash
# Install root-level dependencies
npm install

# Install worker dependencies
cd typescript/job-automation/workers
npm install

# Return to root
cd ../../..
```

### Step 3: Verify Installation

```bash
# Check Node.js version
node --version

# Check npm packages installed
npm list wrangler

# Verify TypeScript is available
npx tsc --version

# Check ESLint is available
npx eslint --version
```

### Step 4: Configure Environment

```bash
# Create .dev.vars for local development (DO NOT COMMIT)
cat > typescript/job-automation/workers/.dev.vars << 'EOF'
JWT_SECRET=dev-secret-key-change-this-in-production
WEBHOOK_SECRET=dev-webhook-secret
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
CLOUDFLARE_API_TOKEN=your-api-token-here
LOG_LEVEL=debug
NODE_ENV=development
EOF

# Add to .gitignore (if not already there)
echo ".dev.vars" >> .gitignore

# Verify file is not staged
git status | grep ".dev.vars"  # Should show: nothing
```

---

## Local Development

### Starting the Development Server

```bash
# Navigate to worker directory
cd typescript/job-automation/workers

# Start local development server
npx wrangler dev

# Output:
# ⎔ wrangler 3.x.x
# ⛅ wrangler dev now uses `unstable_pages` - see docs: https://...
# ✨ Listening on http://localhost:8787/
# [wrangler:inf] GET / 200
```

### Testing Local Endpoints

```bash
# In another terminal, test endpoints

# Health check
curl http://localhost:8787/health

# API statistics
curl http://localhost:8787/api/stats

# Applications list (requires auth - will fail without token)
curl http://localhost:8787/api/applications

# Expected error (401 Unauthorized):
# {"error": "Unauthorized", "message": "Missing or invalid token"}
```

### Hot Reloading

Wrangler automatically reloads when you save files:

```bash
# Edit src/index.js and save
# → Wrangler automatically recompiles and reloads
# → No need to restart the server
```

### Working with Local D1

```bash
# D1 database is simulated with miniflare (in-memory)
# Data is NOT persisted between server restarts

# To test with persistent database:
# 1. Add to wrangler.toml:
# [env.local]
# d1_databases = [{ binding = "DB", database_name = "job-local", database_id = "local" }]

# 2. Run with environment:
npx wrangler dev --env local

# 3. Execute schema:
wrangler d1 execute job-dashboard-db --file migrations/0001_init.sql --env local
```

### Working with Local KV

```bash
# KV is simulated in miniflare (in-memory, not persisted)

# To test KV-backed functionality:
# 1. Use wrangler dev (automatic simulation)
# 2. KV operations are instant (no network latency)
# 3. Data persists during development session only
```

---

## Testing

### Running All Tests

```bash
# From project root
npm run test

# Expected output:
# PASS  tests/unit/handlers/applications.test.js
# PASS  tests/unit/services/auth.test.js
# Test Suites: 8 passed, 8 total
# Tests: 42 passed, 42 total
```

### Running Specific Test Files

```bash
# Run single test file
npm test -- tests/unit/handlers/applications.test.js

# Run tests matching pattern
npm test -- --testNamePattern="ApplicationsHandler"

# Run tests in watch mode (re-run on file change)
npm test -- --watch
```

### Test Coverage

```bash
# Generate coverage report
npm test -- --coverage

# Expected output:
# =============================== Coverage summary ===============================
# Statements   : 85.5%
# Branches     : 78.2%
# Functions    : 90.1%
# Lines        : 85.5%

# Open coverage report
open coverage/lcov-report/index.html
```

---

## Adding New Endpoints

### Step 1: Define Handler Method

Open `src/handlers/your-handler.js`:

```javascript
// src/handlers/custom-handler.js
import { BaseHandler } from './base-handler.js';

export class CustomHandler extends BaseHandler {
  async handleCustomEndpoint(request, env, context) {
    // Validate request
    const { data } = await this.validateRequest(request, {
      method: ['GET', 'POST'],
      body: true,  // Require request body
    });

    // Validate authentication
    const user = await this.validateAuth(request, env);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Business logic
    const result = await someService.process(data);

    // Return response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### Step 2: Register Route in Router

Edit `src/index.js`:

```javascript
import { CustomHandler } from './handlers/custom-handler.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Add your route
    if (path === '/api/custom' && method === 'POST') {
      const handler = new CustomHandler();
      return handler.handleCustomEndpoint(request, env, ctx);
    }

    // ... rest of routing
  }
};
```

### Step 3: Add Tests

Create `tests/unit/handlers/custom.test.js`:

```javascript
import { CustomHandler } from '../../../src/handlers/custom-handler.js';

describe('CustomHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new CustomHandler();
  });

  test('should handle custom endpoint', async () => {
    const request = new Request('http://localhost/api/custom', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await handler.handleCustomEndpoint(request, {}, {});
    expect(response.status).toBe(200);
  });
});
```

### Step 4: Document Endpoint

Add to [API_REFERENCE.md](./API_REFERENCE.md):

```markdown
### Custom Endpoint

**Endpoint**: `POST /api/custom`
**Authentication**: Required (Bearer token)
**Rate Limit**: 60 requests/minute

**Request**:
```json
{
  "data": "value"
}
```

**Response**:
```json
{
  "result": "success",
  "id": "123"
}
```
```

---

## Adding New Handlers

### Handler Structure

Each handler extends `BaseHandler`:

```javascript
import { BaseHandler } from './base-handler.js';

export class MyHandler extends BaseHandler {
  // Private helper methods (underscore prefix)
  async _queryDatabase(query) {
    // Implementation
  }

  // Public handler methods
  async handleMyEndpoint(request, env, context) {
    // Validation
    const { data } = await this.validateRequest(request);
    const user = await this.validateAuth(request, env);

    // Business logic
    const result = await this._queryDatabase(query);

    // Response
    return this.successResponse(result);
  }

  // Error handling
  handleError(error) {
    return this.errorResponse(error.message, 500);
  }
}
```

### Best Practices

1. **Single Responsibility**: Each handler handles one domain
2. **Async/Await**: Use async methods throughout
3. **Validation First**: Validate input before processing
4. **Error Handling**: Wrap in try/catch with proper error responses
5. **Logging**: Log important operations and errors

### Example: Full Handler

```javascript
import { BaseHandler } from './base-handler.js';

export class JobsHandler extends BaseHandler {
  async handleListJobs(request, env, context) {
    try {
      // Validate auth
      const user = await this.validateAuth(request, env);
      if (!user) throw new Error('Unauthorized');

      // Parse query params
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      // Query database
      const jobs = await env.DB.prepare(
        'SELECT * FROM jobs LIMIT ? OFFSET ?'
      ).bind(limit, offset).all();

      const total = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM jobs'
      ).first();

      // Return paginated response
      return this.successResponse({
        jobs: jobs.results,
        pagination: {
          page,
          limit,
          total: total.count,
          pages: Math.ceil(total.count / limit),
        },
      });
    } catch (error) {
      console.error('Error listing jobs:', error);
      return this.errorResponse(error.message);
    }
  }
}
```

---

## Adding Middleware

### Middleware Structure

Middleware functions wrap the request processing chain:

```javascript
// src/middleware/custom-middleware.js

export function customMiddleware(handler) {
  return async (request, env, context) => {
    // Pre-processing
    console.log('Before:', request.method, request.url);

    // Call next middleware/handler
    const response = await handler(request, env, context);

    // Post-processing
    console.log('After:', response.status);

    return response;
  };
}
```

### Adding to Middleware Stack

Edit `src/middleware/stack.js`:

```javascript
import { loggerMiddleware } from './logger.js';
import { corsMiddleware } from './cors.js';
import { rateLimitMiddleware } from './rate-limit.js';
import { customMiddleware } from './custom-middleware.js';

export function buildMiddlewareStack(handler) {
  return loggerMiddleware(
    corsMiddleware(
      rateLimitMiddleware(
        customMiddleware(handler)
      )
    )
  );
}
```

### Example: Custom Middleware

```javascript
// Custom authentication middleware
export function authMiddleware(handler) {
  return async (request, env, context) => {
    const authHeader = request.headers.get('Authorization');

    // Extract token
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate token
    try {
      const decoded = verifyJWT(token, env.JWT_SECRET);
      // Store decoded user in request context
      request.user = decoded;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
      });
    }

    return handler(request, env, context);
  };
}
```

---

## Database Changes

### Creating Migrations

```bash
# Create new migration file
touch typescript/job-automation/workers/migrations/0002_add_column.sql

# Edit file
cat > typescript/job-automation/workers/migrations/0002_add_column.sql << 'EOF'
-- Add new column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_updated_at INTEGER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_status_updated ON applications(status_updated_at DESC);
EOF
```

### Running Migrations Locally

```bash
# Using wrangler dev (in-memory, recreates each startup)
npx wrangler dev

# Run migration once in the session
wrangler d1 execute job-dashboard-db --file migrations/0002_add_column.sql
```

### Running Migrations in Production

```bash
# IMPORTANT: Always backup database first!
# Production backup: https://dash.cloudflare.com/workers/d1

# Run migration
wrangler d1 execute job-dashboard-db \
  --file typescript/job-automation/workers/migrations/0002_add_column.sql \
  --env production

# Verify
wrangler d1 execute job-dashboard-db \
  --command "PRAGMA table_info(applications);" \
  --env production
```

### Querying Database in Code

```javascript
// Single row query
const application = await env.DB.prepare(
  'SELECT * FROM applications WHERE id = ?'
).bind(appId).first();

// Multiple rows
const applications = await env.DB.prepare(
  'SELECT * FROM applications WHERE status = ? LIMIT ?'
).bind('pending', 50).all();

// Insert
const result = await env.DB.prepare(
  'INSERT INTO applications (id, title, company) VALUES (?, ?, ?)'
).bind(newId, title, company).run();

// Update
await env.DB.prepare(
  'UPDATE applications SET status = ? WHERE id = ?'
).bind('applied', appId).run();

// Delete
await env.DB.prepare(
  'DELETE FROM applications WHERE id = ?'
).bind(appId).run();

// Transactions
const batch = env.DB.batch([
  env.DB.prepare('INSERT INTO applications ...').bind(...),
  env.DB.prepare('UPDATE applications ...').bind(...),
]);
await batch;
```

---

## KV Operations

### Basic KV Operations

```javascript
// Set value
await env.SESSIONS.put(
  'session:user-123',
  JSON.stringify({ user: 'john', exp: 1708000000 }),
  { expirationTtl: 86400 }  // 24 hours
);

// Get value
const session = await env.SESSIONS.get('session:user-123', 'json');
// Returns: { user: 'john', exp: 1708000000 }

// Delete value
await env.SESSIONS.delete('session:user-123');

// Check existence
const exists = await env.SESSIONS.get('session:user-123');
if (!exists) {
  // Key doesn't exist
}
```

### KV with Expiration (TTL)

```javascript
// Set with auto-expiration
await env.RATE_LIMIT_KV.put(
  'rate-limit:203.0.113.42',
  JSON.stringify({ tokens: 60, timestamp: Date.now() }),
  {
    expirationTtl: 60,  // Auto-delete after 60 seconds
  }
);

// Check and increment
const key = 'rate-limit:203.0.113.42';
const current = await env.RATE_LIMIT_KV.get(key, 'json');

if (!current) {
  // First request from IP
  await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1 }), {
    expirationTtl: 60,
  });
} else if (current.count < 60) {
  // Still have tokens
  current.count--;
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(current), {
    expirationTtl: 60,
  });
} else {
  // Rate limit exceeded
  return 429;
}
```

### KV Patterns

```javascript
// Namespaced keys for organization
const userId = '123';
const key = `user:${userId}:settings`;

// Batch operations
const keys = [
  'session:user-1',
  'session:user-2',
  'session:user-3',
];
const values = await Promise.all(
  keys.map(k => env.SESSIONS.get(k, 'json'))
);

// List keys (use cautiously - can be slow)
const listResult = await env.SESSIONS.list({
  prefix: 'session:',
  limit: 100,
});

// Iterate through results
for (const key of listResult.keys) {
  const value = await env.SESSIONS.get(key.name, 'json');
  console.log(key.name, value);
}
```

---

## Unit Testing

### Jest Configuration

```javascript
// tests/setup.js
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Cloudflare environment
global.Request = global.Request || class {};
global.Response = global.Response || class {};
```

### Testing Handlers

```javascript
// tests/unit/handlers/custom.test.js
import { CustomHandler } from '../../../src/handlers/custom.js';

describe('CustomHandler', () => {
  let handler;
  let mockEnv;

  beforeEach(() => {
    handler = new CustomHandler();
    mockEnv = {
      DB: {
        prepare: jest.fn().mockReturnValue({
          bind: jest.fn().mockReturnValue({
            all: jest.fn().mockResolvedValue({ results: [] }),
            first: jest.fn().mockResolvedValue({ count: 0 }),
          }),
        }),
      },
      SESSIONS: {
        get: jest.fn().mockResolvedValue(null),
        put: jest.fn().mockResolvedValue(undefined),
      },
    };
  });

  test('should handle request successfully', async () => {
    const request = new Request('http://localhost/api/custom', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer valid-token' },
    });

    const response = await handler.handleEndpoint(request, mockEnv, {});

    expect(response.status).toBe(200);
    expect(mockEnv.DB.prepare).toHaveBeenCalled();
  });

  test('should reject unauthorized requests', async () => {
    const request = new Request('http://localhost/api/custom', {
      method: 'GET',
      headers: {},  // No Authorization
    });

    const response = await handler.handleEndpoint(request, mockEnv, {});

    expect(response.status).toBe(401);
  });
});
```

### Testing Middleware

```javascript
// tests/unit/middleware/rate-limit.test.js
import { rateLimitMiddleware } from '../../../src/middleware/rate-limit.js';

describe('Rate Limit Middleware', () => {
  test('should allow requests under limit', async () => {
    const mockHandler = jest.fn().mockResolvedValue(
      new Response('OK', { status: 200 })
    );

    const middleware = rateLimitMiddleware(mockHandler);

    const request = new Request('http://localhost/api/test', {
      headers: { 'X-Forwarded-For': '203.0.113.42' },
    });

    const response = await middleware(request, {}, {});

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });

  test('should reject requests over limit', async () => {
    // Test rate limit exceeded scenario
  });
});
```

---

## Integration Testing

### End-to-End Testing with Playwright

```javascript
// tests/e2e/api.test.js
import { test, expect } from '@playwright/test';

test.describe('Job Dashboard API', () => {
  const baseUrl = 'http://localhost:8787';
  let authToken;

  test.beforeAll(async () => {
    // Get auth token
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const { token } = await loginResponse.json();
    authToken = token;
  });

  test('should fetch applications list', async () => {
    const response = await fetch(`${baseUrl}/api/applications`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('applications');
    expect(Array.isArray(data.applications)).toBe(true);
  });

  test('should create application', async () => {
    const response = await fetch(`${baseUrl}/api/applications`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Job',
        company: 'Test Corp',
      }),
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
  });
});
```

---

## Debugging

### Console Logging

```javascript
// Use ECS format for logs (compatible with Elasticsearch)
function logECS(level, message, extra = {}) {
  const log = {
    '@timestamp': new Date().toISOString(),
    'log.level': level,
    'message': message,
    ...extra,
  };
  console.log(JSON.stringify(log));
}

// Usage
logECS('info', 'Application created', {
  'application.id': 'app-123',
  'user.id': 'user-456',
});
```

### Local Debugging with Wrangler

```bash
# Start inspector mode
wrangler dev --inspect

# Open Chrome DevTools
# Navigate to: chrome://inspect
# Click "Inspect" on the worker
```

### VS Code Debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Wrangler Dev",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["wrangler", "dev", "--inspect"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Error Tracking

Log errors in structured format:

```javascript
try {
  await someAsyncOperation();
} catch (error) {
  logECS('error', error.message, {
    'error.type': error.constructor.name,
    'error.stack': error.stack,
    'error.code': error.code,
  });
  throw error;
}
```

---

## Performance Profiling

### Measuring Request Duration

```javascript
const startTime = Date.now();

try {
  const result = await dbQuery();
  // Process result
} finally {
  const duration = Date.now() - startTime;
  logECS('info', 'Query completed', {
    'event.duration': duration * 1000000,  // Convert to nanoseconds
    'duration_ms': duration,
  });
}
```

### Database Query Performance

```javascript
// Log slow queries
async function queryWithTiming(db, query, params, slowThreshold = 50) {
  const start = Date.now();
  const result = await db.prepare(query).bind(...params).all();
  const duration = Date.now() - start;

  if (duration > slowThreshold) {
    logECS('warn', 'Slow query detected', {
      'database.query': query,
      'duration_ms': duration,
      'rows_affected': result.count,
    });
  }

  return result;
}
```

### Memory Usage

```javascript
// Cloudflare Workers has 128MB limit
// Monitor by tracking object sizes

function estimateSize(obj) {
  const str = JSON.stringify(obj);
  return Buffer.byteLength(str, 'utf8');
}

const appData = await fetchLargeDataset();
const sizeMB = estimateSize(appData) / (1024 * 1024);
if (sizeMB > 10) {
  logECS('warn', 'Large data allocation', {
    'memory.estimated_mb': sizeMB,
  });
}
```

---

## Workflow Development

### Creating a Workflow

Create `src/workflows/my-workflow.js`:

```javascript
import { WorkflowEntrypoint } from 'cloudflare:workers';

export class MyWorkflow extends WorkflowEntrypoint {
  async run(event, step, env) {
    try {
      // Step 1: Fetch data
      const data = await step.do('fetch-data', async () => {
        const result = await env.DB.prepare(
          'SELECT * FROM applications'
        ).all();
        return result.results;
      });

      // Step 2: Process data
      const processed = await step.do('process', async () => {
        return data.map(item => ({
          ...item,
          processed_at: Date.now(),
        }));
      });

      // Step 3: Send notification
      await step.do('notify', async () => {
        await fetch(env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          body: JSON.stringify({
            text: `Processed ${processed.length} items`,
          }),
        });
      });

      return { success: true, count: processed.length };
    } catch (error) {
      // Handle error
      await env.SLACK_WEBHOOK_URL.post({
        text: `Workflow failed: ${error.message}`,
      });
      throw error;
    }
  }
}
```

### Triggering Workflows

```javascript
// Trigger on-demand
export async function triggerWorkflow(env, workflowName) {
  const workflow = env[workflowName];
  if (!workflow) {
    throw new Error(`Workflow ${workflowName} not found`);
  }

  const id = await workflow.create({
    data: { timestamp: Date.now() },
  });

  return { workflow_id: id, status: 'started' };
}

// Endpoint to trigger
async function handleWorkflowTrigger(request, env) {
  const { workflow } = await request.json();

  const result = await triggerWorkflow(env, workflow);
  return new Response(JSON.stringify(result), { status: 200 });
}
```

### Cron Triggers

Add to `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 * * *"]  # Daily at midnight UTC

[[workflows]]
name = "daily-report-workflow"
main = "src/workflows/daily-report.js"
binding = "DAILY_REPORT"
```

---

## IDE Setup

### VS Code Extensions

Recommended extensions for `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "orta.vscode-jest",
    "wallabyjs.wallaby-vscode",
    "Cloudflare.wrangler"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "dbaeumer.vscode-eslint",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true,
    "**/.wrangler": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.wrangler": true
  },
  "[javascript]": {
    "editor.insertSpaces": true,
    "editor.tabSize": 2
  },
  "[typescript]": {
    "editor.insertSpaces": true,
    "editor.tabSize": 2
  }
}
```

### TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## Common Development Tasks

### Adding a New Parameter to an Endpoint

```javascript
// Before: /api/applications
// After: /api/applications?status=pending&sort=created_at

async function handleListApplications(request, env) {
  const url = new URL(request.url);

  // Extract query parameters
  const status = url.searchParams.get('status') || 'all';
  const sortBy = url.searchParams.get('sort') || 'created_at';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  // Validate parameters
  const validStatuses = ['all', 'pending', 'applied', 'rejected'];
  if (!validStatuses.includes(status)) {
    return errorResponse('Invalid status filter');
  }

  const validSortFields = ['created_at', 'title', 'company'];
  if (!validSortFields.includes(sortBy)) {
    return errorResponse('Invalid sort field');
  }

  // Build SQL query
  let query = 'SELECT * FROM applications WHERE 1=1';
  const params = [];

  if (status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ` ORDER BY ${sortBy} DESC LIMIT ? OFFSET ?`;
  params.push(limit, (page - 1) * limit);

  // Execute query
  const result = await env.DB.prepare(query).bind(...params).all();

  return successResponse({
    applications: result.results,
    pagination: { page, limit, total: result.count },
  });
}
```

### Adjusting Rate Limit

```javascript
// In rate-limit middleware
const RATE_LIMIT = 60;  // Change this value
const RATE_LIMIT_WINDOW = 60;  // seconds

// Or make it configurable
const RATE_LIMIT = parseInt(env.RATE_LIMIT || '60');
const RATE_LIMIT_WINDOW = parseInt(env.RATE_LIMIT_WINDOW || '60');
```

### Adding CORS Support for New Domain

```javascript
const ALLOWED_ORIGINS = [
  'https://resume.jclee.me',
  'https://*.jclee.me',
  'http://localhost:3000',  // Local dev
];

function getCORSHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  return {};
}
```

### Creating a Webhook

```javascript
// Handler for incoming webhook
async function handleWebhook(request, env) {
  // Verify signature
  const signature = request.headers.get('X-Signature');
  const body = await request.text();
  const expectedSig = hashHMAC(body, env.WEBHOOK_SECRET);

  if (signature !== expectedSig) {
    return errorResponse('Invalid signature', 401);
  }

  // Process webhook
  const data = JSON.parse(body);
  await processWebhookData(env, data);

  return successResponse({ received: true });
}

// Endpoint to send webhook
async function sendWebhook(url, data, secret) {
  const body = JSON.stringify(data);
  const signature = hashHMAC(body, secret);

  const response = await fetch(url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
    },
  });

  return response.status === 200;
}
```

---

## Troubleshooting

### Issue: "Module not found"

**Symptom**: `Error: Cannot find module 'x'`

**Solutions**:
1. Check file path is correct
2. Ensure `.js` extension is included
3. Run `npm install` to install dependencies
4. Clear cache: `rm -rf node_modules/.wrangler`

### Issue: "CORS error in browser"

**Symptom**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solutions**:
1. Add CORS headers in middleware
2. Check allowed origins list
3. Verify request method is in allowed methods

### Issue: "Database query timeout"

**Symptom**: `Error: Database operation timed out`

**Solutions**:
1. Add index on frequently queried column
2. Optimize query (avoid SELECT *)
3. Check database connection pool

### Issue: "Rate limit false positives"

**Symptom**: Legitimate requests rejected with 429

**Solutions**:
1. Check rate limit configuration
2. Consider higher limit for authenticated users
3. Clear rate limit KV manually

---

## Best Practices

### Code Organization

```
src/
├── handlers/          # Request handlers (one per domain)
├── services/          # Business logic (stateless)
├── middleware/        # Request/response pipeline
├── utils/             # Utility functions
└── index.js           # Entry point
```

### Error Handling

```javascript
// Always use try/catch
try {
  const result = await operation();
  return successResponse(result);
} catch (error) {
  // Log error
  logECS('error', error.message, {
    'error.stack': error.stack,
  });
  // Return user-friendly error
  return errorResponse('Operation failed', 500);
}
```

### Validation

```javascript
// Always validate input
async function handleCreateApplication(request, env) {
  const data = await request.json();

  // Validate required fields
  if (!data.title || !data.company) {
    return errorResponse('Missing required fields', 400);
  }

  // Validate field types
  if (typeof data.title !== 'string') {
    return errorResponse('Title must be string', 400);
  }

  // Validate field length
  if (data.title.length > 255) {
    return errorResponse('Title too long', 400);
  }
}
```

### No Credentials in Logs

```javascript
// ❌ WRONG - Don't log sensitive data
logECS('info', 'User login', {
  'user.username': username,
  'user.password': password,  // NEVER!
});

// ✅ CORRECT - Only log non-sensitive info
logECS('info', 'User login', {
  'user.id': userId,
  'user.ip': clientIP,
});
```

### Always Use TTL for KV

```javascript
// ❌ WRONG - No TTL, will persist forever
await env.KV.put(key, value);

// ✅ CORRECT - Always set TTL
await env.KV.put(key, value, {
  expirationTtl: 86400,  // 24 hours
});
```

### Async/Await Over Promises

```javascript
// ✅ PREFERRED - Cleaner, easier to debug
async function handler(request, env) {
  const data = await fetch(url);
  const result = await process(data);
  return result;
}

// ❌ LESS PREFERRED - Promise chains harder to debug
function handler(request, env) {
  return fetch(url)
    .then(data => process(data))
    .then(result => result);
}
```

### Environment Variables

```javascript
// ✅ CORRECT - Use env variables
const apiKey = env.API_KEY;

// ❌ WRONG - Hardcoded secrets
const apiKey = 'sk_live_1234567890';
```

---

## Performance Optimization Tips

1. **Index Frequently Queried Columns**
   ```sql
   CREATE INDEX idx_status ON applications(status);
   CREATE INDEX idx_created ON applications(created_at DESC);
   ```

2. **Batch Database Operations**
   ```javascript
   // Better than individual queries
   const batch = env.DB.batch([query1, query2, query3]);
   await batch;
   ```

3. **Cache Static Data in KV**
   ```javascript
   const cacheKey = 'config:v1';
   let config = await env.CONFIG_KV.get(cacheKey, 'json');
   if (!config) {
     config = await loadConfigFromDB();
     await env.CONFIG_KV.put(cacheKey, JSON.stringify(config), {
       expirationTtl: 3600,
     });
   }
   ```

4. **Minimize Response Size**
   ```javascript
   // Only return required fields
   SELECT id, title, company FROM applications  // Good
   SELECT * FROM applications  // Wasteful
   ```

5. **Stream Large Responses**
   ```javascript
   const stream = await generateLargeDataset();
   return new Response(stream, {
     headers: { 'Content-Type': 'application/json' },
   });
   ```

---

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Testing Strategies](./../../tests/AGENTS.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture Diagrams](./DIAGRAMS.md)
