# Visual Regression Testing Guide

**Last Updated**: 2025-12-23  
**Status**: ✅ Implemented

---

## Overview

Visual regression testing ensures UI consistency across deployments by comparing screenshots of the application before and after changes.

## Implementation

### Test Suite: `tests/e2e/visual.spec.js`

**Coverage**: 14 visual regression tests

- Desktop screenshots (5 tests)
- Mobile screenshots (3 tests)
- Tablet screenshots (1 test)
- Dark mode screenshots (1 test)
- Component screenshots (4 tests)

### Snapshots Location

```
tests/e2e/visual.spec.js-snapshots/
├── dark-mode-homepage-chromium-linux.png (1.1 MB)
├── desktop-hero-chromium-linux.png (98 KB)
├── desktop-homepage-chromium-linux.png (1.1 MB)
├── desktop-projects-chromium-linux.png (698 KB)
├── desktop-resume-chromium-linux.png (209 KB)
├── download-buttons-chromium-linux.png (4.6 KB)
├── footer-chromium-linux.png (5.5 KB)
├── mobile-hero-chromium-linux.png (75 KB)
├── mobile-homepage-chromium-linux.png (971 KB)
├── mobile-project-card-chromium-linux.png (77 KB)
├── project-card-chromium-linux.png (86 KB)
└── tablet-homepage-chromium-linux.png (1.3 MB)
```

**Total Size**: ~5.7 MB

---

## Running Tests

### Basic Commands

```bash
# Run all visual regression tests
npm run test:e2e:visual

# Run with UI mode (interactive)
playwright test tests/e2e/visual.spec.js --ui

# Run in headed mode (see browser)
playwright test tests/e2e/visual.spec.js --headed

# Update snapshots (after intentional UI changes)
playwright test tests/e2e/visual.spec.js --update-snapshots
```

### CI/CD Integration

Visual regression tests run automatically in CI/CD pipeline:

```yaml
# .github/workflows/ci.yml
test:e2e:
  script:
    - npm run test:e2e
    - npm run test:e2e:visual
  artifacts:
    when: on_failure
    paths:
      - test-results/
      - playwright-report/
```

---

## Test Configuration

### Viewport Sizes

| Device  | Width | Height | Tests |
| ------- | ----- | ------ | ----- |
| Desktop | 1280  | 720    | 5     |
| Mobile  | 375   | 667    | 3     |
| Tablet  | 768   | 1024   | 1     |

### Tolerance Settings

```javascript
maxDiffPixelRatio: 0.05; // 5% pixel difference allowed
```

This allows for minor rendering differences across environments while catching significant visual changes.

---

## Test Scenarios

### 1. Desktop Screenshots

```javascript
test('homepage full page screenshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await expect(page).toHaveScreenshot('desktop-homepage.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.05,
  });
});
```

**Covers**:

- Full homepage
- Hero section
- Projects section
- Resume section

### 2. Mobile Screenshots

```javascript
test('mobile homepage screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('mobile-homepage.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.05,
  });
});
```

**Covers**:

- Mobile homepage
- Mobile hero section
- Mobile project card

### 3. Dark Mode Screenshots

```javascript
test('dark mode preference screenshot', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('dark-mode-homepage.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.05,
  });
});
```

### 4. Component Screenshots

```javascript
test('single project card screenshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const projectCard = page.locator('.project-card').first();
  await expect(projectCard).toHaveScreenshot('project-card.png', {
    maxDiffPixelRatio: 0.05,
  });
});
```

**Covers**:

- Footer
- Download buttons
- Project card
- Stat card (skipped - removed in redesign)

---

## Updating Snapshots

### When to Update

Update snapshots when:

- ✅ Intentional UI changes (new design, layout updates)
- ✅ CSS modifications
- ✅ Component refactoring
- ❌ Unintentional visual regressions

### Update Process

```bash
# 1. Review current failures
npm run test:e2e:visual

# 2. Verify changes are intentional
playwright test tests/e2e/visual.spec.js --ui

# 3. Update snapshots
playwright test tests/e2e/visual.spec.js --update-snapshots

# 4. Commit new snapshots
git add tests/e2e/visual.spec.js-snapshots/
git commit -m "chore: update visual regression snapshots"
```

---

## Troubleshooting

### Issue: Snapshots differ across environments

**Cause**: Font rendering, OS differences, browser versions

**Solution**:

```javascript
// Use consistent viewport and wait for fonts
await page.setViewportSize({ width: 1280, height: 720 });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Wait for fonts to load
```

### Issue: Flaky tests due to animations

**Cause**: CSS animations, transitions

**Solution**:

```javascript
// Disable animations in test
await page.addStyleTag({
  content: '* { animation: none !important; transition: none !important; }',
});
```

### Issue: Large snapshot file sizes

**Current**: ~5.7 MB total

**Optimization**:

- Use component-level snapshots instead of full-page
- Compress PNG files with `pngquant`
- Consider WebP format for smaller sizes

---

## Best Practices

### 1. Wait for Stability

```javascript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Extra buffer
```

### 2. Use Descriptive Names

```javascript
// Good
'desktop-homepage.png';
'mobile-project-card.png';

// Bad
'test1.png';
'screenshot.png';
```

### 3. Test Critical UI Components

Focus on:

- Homepage (first impression)
- Project cards (main content)
- Resume section (key information)
- Dark mode (user preference)

### 4. Keep Snapshots in Git

- ✅ Commit snapshots to version control
- ✅ Review snapshot changes in PRs
- ✅ Document intentional UI changes

---

## Integration with Other Tests

### Combined Testing Strategy

```bash
# 1. Unit tests (fast, isolated)
npm test

# 2. E2E tests (functionality)
npm run test:e2e

# 3. Visual regression (UI consistency)
npm run test:e2e:visual

# 4. Performance tests (Lighthouse)
npx lhci autorun
```

### CI/CD Pipeline

```yaml
stages:
  - test:unit
  - test:e2e
  - test:visual
  - test:performance
```

---

## Metrics

| Metric         | Value                              |
| -------------- | ---------------------------------- |
| Total Tests    | 14                                 |
| Snapshot Size  | 5.7 MB                             |
| Test Duration  | ~30 seconds                        |
| Coverage       | Desktop, Mobile, Tablet, Dark Mode |
| Max Diff Ratio | 5%                                 |

---

## Future Enhancements

### Planned Improvements

1. **Percy Integration** (Cloud-based visual testing)

   ```bash
   npm install --save-dev @percy/playwright
   ```

2. **Chromatic Integration** (Storybook visual testing)

   ```bash
   npm install --save-dev chromatic
   ```

3. **Automated Snapshot Updates** (on approved PRs)

   ```yaml
   # .github/workflows/update-snapshots.yml
   update-snapshots:
     only:
       - merge_requests
     when: manual
   ```

4. **Cross-browser Testing** (Firefox, Safari)
   ```javascript
   projects: [{ name: 'chromium' }, { name: 'firefox' }, { name: 'webkit' }];
   ```

---

## References

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Percy Documentation](https://docs.percy.io/)
- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Visual Regression Testing Best Practices](https://www.browserstack.com/guide/visual-regression-testing)

---

**Maintained by**: Resume Portfolio Team  
**Last Review**: 2025-12-23  
**Next Review**: 2026-01-23
