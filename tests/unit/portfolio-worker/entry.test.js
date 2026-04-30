const fs = require('fs');
const path = require('path');

describe('entry.js merged-worker contract', () => {
  let source;

  beforeAll(() => {
    source = fs.readFileSync(path.resolve(__dirname, '../../../apps/portfolio/entry.js'), 'utf8');
  });

  test('imports job-dashboard worker as in-process module', () => {
    expect(source).toMatch(/import\s+jobWorker(?:\s*,\s*\{[\s\S]*?\})?\s+from\s+['"]\.\.\/job-dashboard\/src\/index\.js['"]/);
  });

  test('re-exports workflow classes for wrangler binding registration', () => {
    expect(source).toMatch(/export\s*\{[\s\S]*JobCrawlingWorkflow[\s\S]*\}/);
    expect(source).toMatch(/ApplicationWorkflow/);
    expect(source).toMatch(/ResumeSyncWorkflow/);
    expect(source).toMatch(/DailyReportWorkflow/);
    expect(source).toMatch(/HealthCheckWorkflow/);
    expect(source).toMatch(/BackupWorkflow/);
    expect(source).toMatch(/CleanupWorkflow/);
  });

  test('re-exports BrowserSessionDO durable object class', () => {
    expect(source).toMatch(/BrowserSessionDO/);
  });

  test('does NOT use JOB_SERVICE service binding (merged worker has no remote call)', () => {
    expect(source).not.toMatch(/env\.JOB_SERVICE/);
  });

  test('queue handler delegates to jobWorker (not no-op)', () => {
    expect(source).toMatch(/async\s+queue\s*\(\s*batch\s*,\s*env\s*,\s*ctx\s*\)/);
    expect(source).toMatch(/jobWorker\.queue\s*\(\s*batch\s*,\s*env\s*,\s*ctx\s*\)/);
  });

  test('routes /job/* requests to in-process jobWorker.fetch', () => {
    expect(source).toMatch(/url\.pathname\.startsWith\(JOB_ROUTE_PREFIX\)/);
    expect(source).toMatch(/jobWorker\.fetch\s*\(\s*request\s*,\s*env\s*,\s*ctx\s*\)/);
  });

  test('routes profile sync trigger through jobWorker.fetch', () => {
    expect(source).toMatch(/isSingleWorkerProfileSyncTrigger\(url\.pathname,\s*request\.method\)/);
    expect(source).toMatch(/createSingleWorkerProfileSyncRequest\(request\)/);
  });

  test('routes profile sync status through jobWorker.fetch', () => {
    expect(source).toMatch(
      /getSingleWorkerProfileSyncStatusId\(url\.pathname,\s*request\.method\)/
    );
    expect(source).toMatch(/createSingleWorkerProfileSyncStatusRequest\(/);
  });

  test('handles /sitemap.xml directly without proxy', () => {
    expect(source).toMatch(/if \(url\.pathname === '\/sitemap\.xml'\)/);
    expect(source).toMatch(/new Response\(SITEMAP_XML/);
  });

  test('routes locale paths through portfolio worker', () => {
    expect(source).toMatch(/LOCALE_ROUTES\.has\(url\.pathname\)/);
    expect(source).toMatch(/portfolioWorker\.fetch\(localizedRequest,\s*env,\s*ctx\)/);
  });

  test('has error handling that logs and returns 500', () => {
    expect(source).toMatch(/catch \(error\)/);
    expect(source).toMatch(/console\.error\('\[entry\] Unhandled error:'/);
    expect(source).toMatch(/logError\(/);
    expect(source).toMatch(/status:\s*500/);
  });

  test('imports required modules', () => {
    expect(source).toMatch(/import\s+portfolioWorker\s+from\s+['"]\.\/worker\.js['"]/);
    expect(source).toMatch(/from\s+['"]\.\/lib\/entry-router-utils\.js['"]/);
    expect(source).toMatch(/from\s+['"]@resume\/shared\/es-client['"]/);
  });

  test('exports default fetch handler object', () => {
    expect(source).toMatch(/export\s+default\s*\{/);
    expect(source).toMatch(/async\s+fetch\s*\(\s*request,\s*env,\s*ctx\s*\)/);
  });
});
