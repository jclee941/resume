const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.resolve(__dirname, '../../../apps/job-dashboard/src/index.js');

describe('job-dashboard route index orchestrator', () => {
  const modules = ['health', 'auth', 'applications', 'stats', 'automation', 'workflows', 'admin'];

  const fnNameFor = (mod) => {
    const overrides = { workflows: 'registerWorkflowRoutes' };
    return overrides[mod] || `register${mod.charAt(0).toUpperCase() + mod.slice(1)}Routes`;
  };

  let indexSrc;

  beforeAll(() => {
    indexSrc = fs.readFileSync(INDEX_PATH, 'utf8');
  });

  test('imports all register functions from routes barrel', () => {
    expect(indexSrc).toContain("from './routes/index.js'");
    for (const mod of modules) {
      expect(indexSrc).toContain(fnNameFor(mod));
    }
  });

  test('does not contain inline route registrations', () => {
    const routerCalls = indexSrc.match(/router\.(get|post|put|delete)\(/g) || [];
    expect(routerCalls).toHaveLength(0);
  });

  test('builds routeCtx with required handler instances', () => {
    expect(indexSrc).toContain('routeCtx');
    for (const key of [
      'env',
      'apps',
      'stats',
      'auth',
      'webhooks',
      'autoApply',
      'diagnostics',
      'resumeMaster',
      'log',
    ]) {
      expect(indexSrc).toMatch(new RegExp(`\\b${key}\\b`));
    }
  });

  test('preserves middleware stack', () => {
    expect(indexSrc).toContain("request.method === 'OPTIONS'");
    expect(indexSrc).toContain('checkRateLimit');
    expect(indexSrc).toContain('requiresAuth');
    expect(indexSrc).toContain('verifyWebhookSignature');
    expect(indexSrc).toContain('validateCsrf');
  });

  test('preserves queue consumer handler', () => {
    expect(indexSrc).toMatch(/async\s+queue\s*\(/);
    expect(indexSrc).toContain('QueueConsumer');
  });

  test('preserves workflow and DO named exports', () => {
    for (const exp of [
      'JobCrawlingWorkflow',
      'ApplicationWorkflow',
      'ResumeSyncWorkflow',
      'DailyReportWorkflow',
      'HealthCheckWorkflow',
      'BackupWorkflow',
      'CleanupWorkflow',
      'BrowserSessionDO',
    ]) {
      expect(indexSrc).toContain(exp);
    }
  });

  test('is under 200 lines', () => {
    expect(indexSrc.split('\n').length).toBeLessThanOrEqual(200);
  });
});
