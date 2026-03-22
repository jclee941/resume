const fs = require('fs');
const path = require('path');

describe('entry.js service binding contract', () => {
  let source;

  beforeAll(() => {
    source = fs.readFileSync(path.resolve(__dirname, '../../../apps/portfolio/entry.js'), 'utf8');
  });

  test('does not import from job-dashboard', () => {
    expect(source).not.toMatch(/from\s+['"]\.\.\/job-dashboard/);
  });

  test('does not export workflow classes', () => {
    expect(source).not.toMatch(/export\s*\{[\s\S]*Workflow/);
    expect(source).not.toMatch(/Workflow\s*,/);
  });

  test('does not have a queue handler', () => {
    expect(source).not.toMatch(/async\s+queue\s*\(/);
    expect(source).not.toMatch(/queue\s*\(\s*batch/);
  });

  test('uses service binding for job requests', () => {
    expect(source).toMatch(/env\.JOB_SERVICE\.fetch\s*\(\s*request\s*\)/);
  });

  test('proxies /job routes through service binding path', () => {
    expect(source).toMatch(/url\.pathname\.startsWith\(JOB_ROUTE_PREFIX\)/);
    expect(source).toMatch(/fetchJobHandlerResponse\(request,\s*env,\s*ctx,\s*url\.pathname\)/);
  });

  test('proxies profile sync trigger route through service binding', () => {
    expect(source).toMatch(/isSingleWorkerProfileSyncTrigger\(url\.pathname,\s*request\.method\)/);
    expect(source).toMatch(/createSingleWorkerProfileSyncRequest\(request\)/);
    expect(source).toMatch(/fetchJobHandlerResponse\(syncRequest,\s*env,\s*ctx,\s*url\.pathname\)/);
  });

  test('proxies profile sync status route through service binding', () => {
    expect(source).toMatch(
      /getSingleWorkerProfileSyncStatusId\(url\.pathname,\s*request\.method\)/
    );
    expect(source).toMatch(/createSingleWorkerProfileSyncStatusRequest\(/);
    expect(source).toMatch(
      /fetchJobHandlerResponse\(statusRequest,\s*env,\s*ctx,\s*url\.pathname\)/
    );
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

  test('exports only default fetch handler object', () => {
    expect(source).toMatch(/export\s+default\s*\{/);
    expect(source).toMatch(/async\s+fetch\s*\(\s*request,\s*env,\s*ctx\s*\)/);
    expect(source).not.toMatch(/^export\s+(?!default)(?:const|let|var|function|class|\{)/gm);
  });
});
