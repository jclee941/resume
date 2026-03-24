# Testing Infrastructure

This directory contains all automated tests for the resume project.

## Test Structure

```
tests/
├── unit/           # Unit tests (Jest)
├── e2e/            # End-to-end tests (Playwright)
└── README.md       # This file
```

## Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

## Running Tests

### Unit Tests (Jest)

```bash
# Run all unit tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run all e2e tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### All Tests

```bash
# Run everything
npm test && npm run test:e2e
```

## Test Coverage

### Current Coverage

- **Unit Tests**: `generate-worker.js` (100%)
- **E2E Tests**: Homepage, Resume page, Responsive design, Security headers
- **Target**: 80% coverage

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

## Writing Tests

### Unit Test Example

```javascript
// tests/unit/example.test.js
const { someFunction } = require('../../path/to/module');

describe('Module Name', () => {
  test('should do something', () => {
    const result = someFunction();
    expect(result).toBe(expected);
  });
});
```

### E2E Test Example

```javascript
// tests/e2e/example.spec.js
const { test, expect } = require('@playwright/test');

test('should load page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Expected Title/);
});
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/release.yml` or `.github/workflows/ci.yml` as appropriate:

```yaml
name: Tests

on:
  push:
    branches: [master]
  pull_request:

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Scenarios

### Unit Tests

- ✅ Worker generation
- ✅ HTML escaping (backticks, dollar signs)
- ✅ Security headers injection
- ✅ Routing logic

### E2E Tests

- ✅ Homepage loads successfully
- ✅ Hero section displays correctly
- ✅ 5 project cards visible
- ✅ Dark mode toggle works
- ✅ Statistics section displays
- ✅ Scroll to top button functions
- ✅ Resume page loads
- ✅ Mobile responsive (375px)
- ✅ Tablet responsive (768px)
- ✅ Performance < 3s load time
- ✅ No console errors
- ✅ Security headers present

### Visual Regression (TODO)

- [ ] Homepage screenshot baseline
- [ ] Resume page screenshot baseline
- [ ] Dark mode screenshot baseline
- [ ] Mobile view screenshot baseline

## Debugging Tests

### Jest Debugging

```bash
# Run single test file
npm test -- tests/unit/generate-worker.test.js

# Debug with Chrome DevTools
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Debugging

```bash
# Debug mode (opens browser)
npx playwright test --debug

# Trace viewer
npx playwright test --trace on
npx playwright show-trace trace.zip

# Codegen (record test)
npx playwright codegen https://resume.jclee.me
```

## Best Practices

1. **Unit Tests**
   - Test one thing at a time
   - Use descriptive test names
   - Mock external dependencies
   - Aim for 80%+ coverage

2. **E2E Tests**
   - Test user workflows
   - Use semantic selectors (prefer text/ARIA over CSS)
   - Keep tests independent
   - Clean up test data

3. **General**
   - Write tests before fixing bugs
   - Keep tests fast (< 5s per test)
   - Update tests when code changes
   - Document complex test scenarios

## Troubleshooting

### Issue: "Playwright browsers not installed"

```bash
npx playwright install
```

### Issue: "Port 8787 already in use"

```bash
# Kill existing wrangler process
pkill -f wrangler
```

### Issue: "Tests fail on CI but pass locally"

- Check browser versions match
- Verify environment variables
- Check for timing-dependent tests
- Use `page.waitForTimeout()` sparingly

### Issue: "Coverage below threshold"

```bash
# See uncovered lines
npm run test:coverage
# Check coverage/lcov-report/index.html
```

## Future Enhancements

- [ ] Visual regression testing (Percy/Chromatic)
- [ ] Accessibility testing (axe-core)
- [ ] Performance testing (Lighthouse CI)
- [ ] API testing (if backend added)
- [ ] Load testing (k6)
- [ ] Mutation testing (Stryker)

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://testingjavascript.com/)
