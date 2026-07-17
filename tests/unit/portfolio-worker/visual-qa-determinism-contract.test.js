const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('portfolio bootstrap readiness contract', () => {
  const main = read('apps/portfolio/src/scripts/main.js');

  test('publishes explicit success and error states without swallowing resume-data failures', () => {
    expect(main).toContain("setAttribute('data-portfolio-ready', 'true')");
    expect(main).toContain("setAttribute('data-portfolio-ready', 'error')");
    expect(main).toContain("role = 'status'");
    expect(main).toContain("aria-live', 'assertive'");
    expect(main).toContain("event: 'portfolio_bootstrap_failed'");
    expect(main).not.toContain("console.warn('[ResumeData]");
  });
});

describe('multilingual visual QA contract', () => {
  const visual = read('tests/e2e/visual.spec.js');
  const harness = read('tests/e2e/fixtures/portfolio-qa.js');
  const config = read('playwright.config.js');
  const manifest = JSON.parse(read('tests/e2e/portfolio-visual-snapshot-manifest.json'));

  test('pins locale, viewport, motion, region, and state coverage', () => {
    expect(manifest.locales).toEqual([
      { id: 'ko', path: '/ko/' },
      { id: 'en', path: '/en/' },
      { id: 'ja', path: '/ja/' },
    ]);
    expect(manifest.viewports.map(({ width }) => width)).toEqual([375, 768, 1280]);
    expect(manifest.motionModes).toEqual(['normal', 'reduced']);
    expect(manifest.coreRegions.map(({ id }) => id)).toEqual([
      'full-page',
      'hero',
      'projects',
      'capabilities',
    ]);
    expect(manifest.interactionStates.map(({ id }) => id)).toEqual([
      'cover-expanded',
      'mobile-nav-open',
      'focus-visible',
      'capability-selected',
      'projects-expanded',
      'mobile-actions',
    ]);
    expect(manifest.snapshotApproval).toMatchObject({
      status: 'approved-after-final-review-remediation',
      updateExecuted: true,
      approvedSnapshotCount: 156,
    });
    expect(manifest.capturePolicy).toEqual({
      fixedUiSelectors: ['.mobile-actions', '.back-to-top'],
      dedicatedState: 'mobile-actions',
    });
    expect(manifest.snapshotApproval.approvalEvidence).toEqual([
      '.omo/evidence/portfolio-fullstack-rebrand/working/final-wave-remediation/DoneClaim.json',
    ]);
    for (const evidencePath of manifest.snapshotApproval.approvalEvidence) {
      expect(fs.existsSync(path.join(ROOT, evidencePath))).toBe(true);
    }
    expect(visual).toContain('PORTFOLIO_COMPARE_APPROVED_SNAPSHOTS');
    expect(harness).toContain("toHaveAttribute('data-portfolio-ready', 'true'");
  });

  test('removes polling, server skips, CI threshold relaxation, and networkidle waits', () => {
    expect(visual).not.toMatch(/test\.skip|__visualMetrics|__visualStableCount|waitForTimeout/);
    expect(visual).not.toMatch(/networkidle|Math\.max\([^)]*0\.3/);
    expect(config).toContain('maxDiffPixelRatio: 0.05');
    expect(harness).toContain('FULL_PAGE_DIFF_RATIO = 0.1');
    expect(harness).toContain('COMPONENT_DIFF_RATIO = 0.05');
  });
});
