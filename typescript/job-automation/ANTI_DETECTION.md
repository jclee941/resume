# Anti-Detection & Security Guide

**Purpose**: Document stealth techniques, WAF bypass strategies, and security considerations  
**Audience**: Developers implementing crawlers, scripts, and automation workflows

## HTTP-Level Anti-Detection

### 1. User-Agent Rotation

**Why**: CloudFront WAF detects headless browsers via User-Agent string

**Implementation** (`src/crawlers/base-crawler.js`):

```javascript
static #USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ... Chrome/131.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ... Chrome/130.0.0.0',
  // ... 10 more Chrome versions (v129, v128, v127, v126, v125, v124, v123, v122, v121, v120)
];

static #getRandomUA() {
  return this.#USER_AGENTS[Math.floor(Math.random() * this.#USER_AGENTS.length)];
}

static async fetch(url, options) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': this.#getRandomUA(),
      ...options.headers
    }
  });
  return response;
}
```

**Coverage**: 12 Chrome versions (v120-v131) to avoid fingerprinting based on specific version

### 2. Request Delay + Jitter

**Why**: Rapid consecutive requests trigger rate limiting/WAF

**Implementation** (`src/crawlers/base-crawler.js`):

```javascript
static async fetch(url, options) {
  // Base delay: 1000ms + jitter: 0-500ms
  const baseDelay = 1000;
  const jitter = Math.random() * 500;
  await new Promise(r => setTimeout(r, baseDelay + jitter));
  
  return fetch(url, options);
}
```

**Rationale**: 1-1.5s between requests mimics human behavior

### 3. Exponential Backoff on Retry

**Why**: Avoid hammering server on rate limit (429) or timeout (503/504)

**Implementation**:

```javascript
// Retry delays: 2s, 4s, 8s (doubles each attempt)
const delays = [2000, 4000, 8000];
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    return await fetch(url, options);
  } catch (e) {
    if (attempt < 2) {
      const waitTime = delays[attempt];
      this.#emit('retry', { attempt: attempt + 1, error: e.message });
      await new Promise(r => setTimeout(r, waitTime));
    } else {
      throw e;
    }
  }
}
```

**Max Total Wait**: 2s + 4s + 8s = 14s before giving up

### 4. Request Headers

**Why**: Headless browsers send suspicious header combinations

**Always Include**:

```javascript
{
  'Accept': 'application/json, text/html',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Sec-Ch-Ua': 'Not A(Brand";v="99", "Google Chrome";v="131"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1'
}
```

### 5. Cookie Persistence

**Why**: Lost/stale cookies trigger re-authentication → detectable patterns

**Implementation** (`src/shared/services/session/session-manager.js`):

```javascript
class SessionManager {
  static getCookies(platform) {
    const data = JSON.parse(fs.readFileSync('~/.opencode/data/sessions.json'));
    const session = data[platform];
    
    // Check TTL (24 hours)
    if (Date.now() - session.timestamp > 86400000) {
      return null; // Session expired
    }
    
    return session.cookies;
  }
  
  static setCookies(platform, cookies) {
    // Isolate by platform to prevent cross-platform cookie leakage
    const data = JSON.parse(fs.readFileSync('~/.opencode/data/sessions.json'));
    data[platform] = {
      cookies,
      timestamp: Date.now(),
      ttl: 86400000
    };
    fs.writeFileSync('~/.opencode/data/sessions.json', JSON.stringify(data, null, 2));
  }
}
```

## Browser-Level Anti-Detection (Puppeteer Only)

### CloudFront WAF Bypass Strategy

**Problem**: Wanted.co.kr uses CloudFront WAF that blocks Puppeteer/Playwright

**Solution**: Manual cookie extraction via Chrome DevTools Protocol

### Current Approach: Puppeteer-Extra + Stealth Plugins

**Location**: `scripts/quick-login.js` (Puppeteer-based)

```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1280,1024'
  ]
});

// 1. Navigate to login page
// 2. Wait for user input
// 3. Extract cookies → ~/.opencode/data/sessions.json
```

### Recommended Approach: Chrome DevTools Protocol (CDP)

**Location**: `scripts/extract-cookies-cdp.js` (NEW)

**Advantages**:
- Bypasses CloudFront WAF (connects directly to Chrome)
- Faster (no browser rendering overhead)
- More reliable (native Chrome protocol)
- Less resource-intensive

**Implementation Pattern**:

```javascript
const CDP = require('chrome-remote-interface');

// Connect to running Chrome instance
const client = await CDP({ port: 9222 });

// Enable Network domain
await client.Network.enable();

// Set cookies from file
const cookies = fs.readFileSync('~/.opencode/data/cookies.json');
await Promise.all(
  cookies.map(c => client.Network.setCookie(c))
);

// Make requests
const { responseHeaders, body } = await client.Network.getResponseBody(requestId);
```

### Puppeteer vs Playwright vs CDP

| Approach    | CloudFront WAF | Speed | Stealth | Resource Use |
| ----------- | -------------- | ----- | ------- | ------------ |
| Playwright  | ❌ Blocked     | Fast  | Medium  | Medium       |
| Puppeteer   | ⚠️ Partial     | Fast  | Good    | Medium       |
| CDP (Direct)| ✅ Passes      | Fast  | Excellent | Low        |
| Cookie Only | ✅ Passes      | Fast  | Perfect | Very Low     |

**Recommendation**: Use CDP for login automation, manual extraction for production

## Session Management Security

### Cookie Storage

**Location**: `~/.opencode/data/sessions.json`

**Never Commit**: This file contains authentication credentials

**Structure**:

```json
{
  "wanted": {
    "cookies": "wantedToken=...; wantedRefresh=...",
    "timestamp": 1707000000000,
    "ttl": 86400000
  },
  "jobkorea": {
    "cookies": "...",
    "timestamp": 1707000000000,
    "ttl": 86400000
  }
}
```

### TTL Management

**24-Hour Expiration**:
- SessionManager validates TTL before use
- Stale sessions trigger re-authentication flow
- Prevents cookie rotation → bot detection

### Per-Platform Isolation

**Why**: Prevent cross-platform cookie leakage

```javascript
// ✅ Correct: Isolated per platform
const wantedCookies = SessionManager.getCookies('wanted');
const jobkoreaCookies = SessionManager.getCookies('jobkorea');

// ❌ Wrong: Shared cookies
const cookies = SessionManager.getCookies();
```

## Rate Limiting Strategies

### Token Bucket Algorithm

**Location**: `src/crawlers/base-crawler.js`

```javascript
// 1 request per second per platform
// Burst capacity: 5 requests (allows temporary peaks)
class RateLimiter {
  constructor(tokensPerSecond = 1, maxTokens = 5) {
    this.tokensPerSecond = tokensPerSecond;
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + timePassed * this.tokensPerSecond
    );
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait for next token
    const waitTime = (1 - this.tokens) / this.tokensPerSecond * 1000;
    await new Promise(r => setTimeout(r, waitTime));
    this.tokens = 0;
  }
}
```

### Handling 429 Too Many Requests

**Strategy**: Exponential backoff + back-off signal to other requests

```javascript
// In BaseCrawler
if (response.status === 429) {
  // Emit global rate-limit signal
  this.#emit('rateLimit', { retryAfter: response.headers['retry-after'] });
  
  // Exponential backoff
  await delay(delays[attempt]);
  
  // Retry
}
```

## Error Handling Without Credential Leakage

### ECS-Format Logging

**Location**: `src/shared/services/logging/log-service.js`

```javascript
class LogService {
  static logError(error, context) {
    // ✅ Safe: Log error type, not credentials
    const log = {
      level: 'error',
      message: error.message,
      error_code: error.code,
      timestamp: new Date().toISOString(),
      context: {
        platform: context.platform,
        endpoint: context.endpoint,
        attempt: context.attempt
      }
      // ❌ Never include: credentials, cookies, API keys
    };
    
    console.error(JSON.stringify(log));
  }
}
```

### Domain-Specific Error Classes

```javascript
class RateLimitError extends Error {
  constructor(retryAfter) {
    super('Rate limited by server');
    this.code = 'RATE_LIMIT';
    this.retryAfter = retryAfter;
  }
}

class AuthenticationError extends Error {
  constructor() {
    super('Invalid credentials');
    this.code = 'AUTH_FAILED';
    // Don't expose actual credentials
  }
}
```

## Monitoring Anti-Detection Health

### Key Metrics

| Metric           | Target | Alert If |
| ---------------- | ------ | -------- |
| Request latency  | 1-2s   | > 5s     |
| Retry rate       | < 5%   | > 10%    |
| 429 responses    | 0      | > 0      |
| 403 responses    | 0      | > 0      |
| Session TTL      | 24h    | < 1h     |
| Cookie freshness | 24h    | stale    |

### Health Check Endpoint

```bash
curl https://resume.jclee.me/api/health

{
  "status": "healthy",
  "crawlers": {
    "wanted": { "status": "ok", "last_request": "2s ago" },
    "jobkorea": { "status": "ok", "last_request": "30s ago" }
  },
  "sessions": {
    "wanted": { "ttl_remaining": "23h 45m", "status": "valid" },
    "jobkorea": { "ttl_remaining": "expired", "status": "needs_refresh" }
  },
  "rate_limit": {
    "requests_per_second": 0.8,
    "burst_capacity": 5
  }
}
```

## Deployment Checklist

- [ ] UA rotation pool has ≥10 versions
- [ ] Request delay minimum is 1s
- [ ] Exponential backoff configured (2s, 4s, 8s)
- [ ] Cookie storage has 24h TTL
- [ ] Session per-platform isolation enabled
- [ ] No credentials in logs (ECS format)
- [ ] Rate limiter configured
- [ ] Health check monitoring enabled
- [ ] Slack alerts on auth failures
- [ ] Manual cookie extraction backup available

## Troubleshooting

### "CloudFront WAF blocked request"

1. Check UA rotation (should vary per request)
2. Verify request delay (minimum 1s)
3. Try manual cookie extraction (scripts/extract-cookies-cdp.js)
4. Check Session TTL (shouldn't be stale)

### "429 Too Many Requests"

1. Increase base delay (currently 1s)
2. Reduce parallel request concurrency
3. Check rate limiter tokens
4. Verify exponential backoff is working

### "Session expired"

1. Run `node scripts/quick-login.js` to refresh
2. Check `~/.opencode/data/sessions.json` TTL
3. Manual extract cookies if needed
4. Restart service after refresh

## References

- Wanted CloudFront WAF: Blocks headless browsers
- Puppeteer-Extra: Stealth plugin list
- Chrome DevTools Protocol: Official CDP docs
- ECS Logging: Elastic Common Schema format
