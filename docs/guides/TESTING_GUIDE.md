# Testing Guide

## Test Overview

This project uses a comprehensive testing strategy with three layers:

1. **Unit Tests** (Jest): Fast, isolated component testing
2. **Integration Tests**: API and routing validation
3. **E2E Tests** (Playwright): Full browser automation testing

## Quick Commands

```bash
# Unit tests
npm test                # Run all unit tests
npm run test:watch      # Watch mode for development
npm run test:coverage   # Generate coverage report

# E2E tests
npm run test:e2e        # Headless mode (CI)
npm run test:e2e:ui     # Interactive UI mode (debugging)
npm run test:e2e:headed # Visible browser mode

# Pre-deployment validation
npm run build && npm test && npm run test:e2e
```

## Unit Tests

### Framework & Configuration

- **Framework**: Jest 30.2.0
- **Config**: `jest.config.cjs` (CommonJS format)
- **Location**: `tests/unit/`
- **Focus**: Worker generation, HTML escaping, security headers

### Key Test: `generate-worker.test.js`

Validates critical worker generation logic:

**1. Worker.js Generation**:

```javascript
// Tests worker.js is created and contains expected content
expect(fs.existsSync(workerPath)).toBe(true);
expect(workerContent).toContain('addEventListener');
expect(workerContent).toContain('<!DOCTYPE html>');
```

**2. Minification**:

```javascript
// Validates HTML minification (15% size reduction)
const originalSize = htmlContent.length;
const minifiedSize = minifiedHtml.length;
expect(minifiedSize).toBeLessThan(originalSize);
```

**3. Template Literal Escaping**:

```javascript
// Ensures backticks and $ are properly escaped
expect(workerContent).not.toContain('`'); // Backticks escaped
expect(workerContent).toMatch(/\\\$/); // Dollar signs escaped
```

**4. CSP Hash Generation**:

```javascript
// Verifies SHA-256 hashes for inline scripts/styles
expect(workerContent).toMatch(/script-src[^;]*'sha256-[A-Za-z0-9+/=]+'/);
expect(workerContent).toMatch(/style-src[^;]*'sha256-[A-Za-z0-9+/=]+'/);
```

**5. Security Headers**:

```javascript
// Checks all security headers are present
expect(workerContent).toContain('Content-Security-Policy');
expect(workerContent).toContain('X-Frame-Options: DENY');
expect(workerContent).toContain('Strict-Transport-Security');
```

**6. Routing Logic**:

```javascript
// Tests URL routing patterns
expect(workerContent).toContain('/health');
expect(workerContent).toContain('/metrics');
expect(workerContent).toContain('/api/vitals');
```

### Running Specific Tests

```bash
# Run single test file
npm test -- tests/unit/generate-worker.test.js

# Run tests matching pattern
npm test -- --testNamePattern="CSP hash"
npm test -- --testNamePattern="escaping"

# Watch specific test
npm test -- tests/unit/generate-worker.test.js --watch
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# Output location: coverage/lcov-report/index.html
# Open in browser to view detailed coverage
```

## E2E Tests

### Framework & Configuration

- **Framework**: Playwright 1.56.0
- **Config**: `playwright.config.js`
- **Location**: `tests/e2e/`
- **Browsers**: Chromium, Firefox, WebKit (all tested in parallel)

### Key Test: `portfolio.spec.js`

**CRITICAL: Test Expectations** (line 13):

```javascript
const EXPECTED_COUNTS = {
  RESUME_CARDS: 5, // Must match data.json "resume" array length
  PROJECTS: 11, // Must match data.json "projects" array length
};
```

**⚠️ Important**: When adding/removing projects in `data.json`, update these constants!

### Test Categories

**1. Basic Functionality** (7 tests):

- Page loads successfully
- Page title correct
- Main sections present (hero, resume, projects, contact)
- Navigation links work
- Footer present

**2. Content Validation** (8 tests):

```javascript
// Resume cards count
const resumeCards = await page.locator('.doc-card').count();
expect(resumeCards).toBe(EXPECTED_COUNTS.RESUME_CARDS);

// Project cards count
const projectCards = await page.locator('.project-card').count();
expect(projectCards).toBe(EXPECTED_COUNTS.PROJECTS);

// Content presence
expect(await page.locator('h1').textContent()).toContain('Infrastructure');
```

**3. Dark Mode** (3 tests):

- Toggle button works
- Theme persists (localStorage)
- CSS variables change

**4. Responsive Design** (5 tests):

- Mobile viewport (375px)
- Tablet viewport (768px)
- Desktop viewport (1200px)
- Hamburger menu on mobile
- Touch targets >= 44px

**5. Performance** (4 tests):

- Page load time < 3s
- LCP (Largest Contentful Paint) < 2.5s
- CLS (Cumulative Layout Shift) < 0.1
- No console errors

**6. Accessibility** (4 tests):

- ARIA labels present
- Semantic HTML structure
- Keyboard navigation works
- Color contrast ratios meet WCAG AA

**7. Security** (3 tests):

- CSP headers present
- HTTPS redirect
- No inline scripts (except with valid CSP hash)

### Running E2E Tests

```bash
# All browsers (default)
npm run test:e2e

# Specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Specific test file
npm run test:e2e -- tests/e2e/portfolio.spec.js

# Interactive mode (debugging)
npm run test:e2e:ui

# Headed mode (visible browser)
npm run test:e2e:headed

# Specific test by name
npm run test:e2e -- --grep "dark mode"
```

### Debugging E2E Tests

**Interactive UI Mode** (recommended for debugging):

```bash
npm run test:e2e:ui
```

**Features**:

- Visual test runner
- Time-travel debugging
- Step-by-step execution
- Screenshot on failure
- Video recording

**Headed Mode** (visible browser):

```bash
npm run test:e2e:headed
```

**Trace Viewer** (after failure):

```bash
npx playwright show-trace test-results/path-to-trace.zip
```

## Integration Tests

### Location

`tests/integration/`

### Focus Areas

- Worker HTML serving
- Routing logic
- Health endpoints
- Metrics collection
- Error handling

## Performance Tests

### Lighthouse CI

**Configuration**: `.github/workflows/ci.yml` (lighthouse job)

**Budgets**:

- Performance: ≥90 score
- Accessibility: ≥95 score
- Best Practices: ≥95 score
- SEO: ≥95 score

**Web Vitals Targets**:

- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1
- FCP (First Contentful Paint): <1.8s
- TTFB (Time to First Byte): <0.8s

### Running Lighthouse Locally

```bash
# Install Lighthouse
npm install -g @lhci/cli

# Run audit
lhci autorun

# Or use Chrome DevTools:
# 1. Open https://resume.jclee.me
# 2. F12 → Lighthouse tab
# 3. Generate report
```

## Test Workflow Best Practices

### Before Committing

```bash
# 1. Build latest worker.js
npm run build

# 2. Run all tests
npm test && npm run test:e2e

# 3. Check lint
npm run lint

# 4. Format code
npm run format
```

### CI/CD Pipeline

GitHub Actions runs tests automatically:

1. **Unit Tests** → Must pass (blocks deployment)
2. **E2E Tests** → Must pass (blocks deployment)
3. **Lighthouse** → Warning only (doesn't block)

**View Results**:

- GitHub Actions tab
- PR status checks
- Deployment logs

## Common Testing Issues

### Issue 1: E2E Tests Fail with Count Mismatch

**Error**: `Expected 14 projects, found 11`

**Cause**: Added/removed projects in `data.json` but didn't update test expectations

**Solution**:

```bash
# 1. Count projects
jq '.projects | length' typescript/portfolio-worker/data.json

# 2. Update tests/e2e/portfolio.spec.js line 13
const EXPECTED_COUNTS = {
  RESUME_CARDS: 5,
  PROJECTS: 11  # Update this
};

# 3. Rebuild and retest
npm run build && npm run test:e2e
```

### Issue 2: E2E Tests Pass Locally, Fail in CI

**Cause**: Worker.js not rebuilt before running tests

**Solution**:

```bash
# Always build before E2E tests
npm run build && npm run test:e2e
```

**CI Fix**: Ensure GitHub Actions workflow includes build step:

```yaml
- name: Generate Worker
  run: npm run build
- name: Run E2E Tests
  run: npm run test:e2e
```

### Issue 3: Flaky E2E Tests

**Symptoms**: Tests pass/fail randomly

**Common Causes**:

1. Network timeout (API calls)
2. Animation timing
3. Race conditions

**Solutions**:

```javascript
// Add explicit waits
await page.waitForSelector('.project-card', { timeout: 5000 });

// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for animations
await page.waitForTimeout(300);
```

### Issue 4: CSP Violations in Browser Console

**Error**: "Refused to execute inline script because it violates CSP"

**Cause**: CSP hash mismatch after HTML/CSS changes

**Solution**:

```bash
# Rebuild (recalculates CSP hashes)
npm run build

# Verify hashes
npm test -- --testNamePattern="CSP hash"

# Deploy
npm run deploy
```

## Test Data Management

### Test Fixtures

Location: `tests/fixtures/`

**Example**:

```javascript
// tests/fixtures/mock-data.json
{
  "resume": [
    { "title": "Test Project", ... }
  ],
  "projects": [
    { "title": "Test Portfolio", ... }
  ]
}
```

### Using Fixtures

```javascript
const mockData = require('../fixtures/mock-data.json');

test('generates cards from mock data', () => {
  const html = generateResumeCards(mockData);
  expect(html).toContain('Test Project');
});
```

## Continuous Improvement

### Test Metrics to Monitor

- **Coverage**: Target 80%+
- **Execution Time**: Unit < 5s, E2E < 60s
- **Flakiness Rate**: < 1%
- **False Positive Rate**: < 5%

### Adding New Tests

**When to add tests**:

1. New feature → Unit + E2E tests
2. Bug fix → Regression test
3. Refactoring → Maintain coverage

**Example**:

```javascript
// New feature: Add GitHub stars counter
describe('GitHub Stars Counter', () => {
  test('displays star count', async () => {
    await page.goto('/');
    const stars = await page.locator('.github-stars').textContent();
    expect(parseInt(stars)).toBeGreaterThan(0);
  });
});
```

## Resources

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Playwright Documentation**: https://playwright.dev/
- **Lighthouse CI**: https://github.com/GoogleChrome/lighthouse-ci
- **Web Vitals**: https://typescript/portfolio-worker.dev/vitals/

---

**Last Updated**: 2025-11-19
**Test Status**: 58/58 passing (24 unit + 34 E2E)
