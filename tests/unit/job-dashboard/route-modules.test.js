const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.resolve(__dirname, '../../../apps/job-dashboard/src/routes');

/**
 * Structural tests for Phase 2 route module extraction.
 * Verifies that all 48 routes are properly distributed across 7 modules
 * with correct register function exports and route patterns.
 */
describe('job-dashboard route modules', () => {
  const modules = ['health', 'auth', 'applications', 'stats', 'automation', 'workflows', 'admin'];

  // Map module filename → exported function name (workflows.js exports singular "Workflow")
  const fnNameFor = (mod) => {
    const overrides = { workflows: 'registerWorkflowRoutes' };
    return overrides[mod] || `register${mod.charAt(0).toUpperCase() + mod.slice(1)}Routes`;
  };

  describe('barrel export', () => {
    let barrel;

    beforeAll(() => {
      barrel = fs.readFileSync(path.join(ROUTES_DIR, 'index.js'), 'utf8');
    });

    test('re-exports all 7 register functions', () => {
      for (const mod of modules) {
        const fnName = fnNameFor(mod);
        expect(barrel).toContain(fnName);
        expect(barrel).toContain(`./${mod}.js`);
      }
    });

    test('has exactly 7 export lines', () => {
      const exportLines = barrel.split('\n').filter((l) => l.includes('export'));
      expect(exportLines).toHaveLength(7);
    });
  });

  describe('module files exist and export register functions', () => {
    for (const mod of modules) {
      test(`${mod}.js exports register function`, () => {
        const src = fs.readFileSync(path.join(ROUTES_DIR, `${mod}.js`), 'utf8');
        const fnName = fnNameFor(mod);
        expect(src).toMatch(new RegExp(`export function ${fnName}\\(router, ctx\\)`));
      });
    }
  });

  describe('route distribution', () => {
    const expectedRoutes = {
      health: {
        count: 4,
        patterns: ['/health', '/api/health', '/api/status', '/api/health/notifications'],
      },
      auth: {
        count: 7,
        patterns: [
          '/api/auth/status',
          '/api/auth/set',
          '/api/auth/sync',
          '/api/auth/:platform',
          '/api/auth/profile',
          '/api/auth/login',
          '/api/auth/logout',
        ],
      },
      applications: {
        count: 8,
        patterns: [
          '/api/applications',
          '/api/applications/sync/wanted',
          '/api/applications/:id',
          '/api/applications/:id/status',
          '/api/cleanup',
        ],
      },
      stats: {
        count: 4,
        patterns: ['/api/stats', '/api/stats/weekly', '/api/report', '/api/report/weekly'],
      },
      automation: {
        count: 14,
        patterns: [
          '/api/automation/search',
          '/api/automation/apply',
          '/api/automation/report',
          '/api/automation/resume',
          '/api/auto-apply/status',
          '/api/auto-apply/run',
          '/api/auto-apply/config',
          '/api/automation/profile-sync',
          '/api/automation/profile-sync/history',
          '/api/automation/profile-sync/:syncId',
          '/api/automation/profile-sync/callback',
          '/api/resume/master',
          '/api/test/chaos-resumes',
        ],
      },
      workflows: {
        count: 7,
        patterns: [
          '/api/workflows/job-crawling',
          '/api/workflows/application',
          '/api/workflows/resume-sync',
          '/api/workflows/daily-report',
          '/api/workflows/:workflowType/:instanceId',
          '/api/workflows/application/:instanceId/approve',
          '/api/workflows/application/:instanceId/reject',
        ],
      },
      admin: {
        count: 6,
        patterns: [
          '/api/diagnostics/bindings',
          '/api/config',
          '/api/queue/enqueue',
          '/api/queue/status',
        ],
      },
    };

    for (const [mod, expected] of Object.entries(expectedRoutes)) {
      describe(`${mod}.js`, () => {
        let src;

        beforeAll(() => {
          src = fs.readFileSync(path.join(ROUTES_DIR, `${mod}.js`), 'utf8');
        });

        test(`registers ${expected.count} routes`, () => {
          const routeCalls = src.match(/router\.(get|post|put|delete)\(/g) || [];
          expect(routeCalls).toHaveLength(expected.count);
        });

        test('contains all expected route patterns', () => {
          for (const pattern of expected.patterns) {
            expect(src).toContain(`'${pattern}'`);
          }
        });
      });
    }
  });

  describe('total route count across all modules', () => {
    test('all modules together register exactly 50 routes', () => {
      let totalRoutes = 0;
      for (const mod of modules) {
        const src = fs.readFileSync(path.join(ROUTES_DIR, `${mod}.js`), 'utf8');
        const routeCalls = src.match(/router\.(get|post|put|delete)\(/g) || [];
        totalRoutes += routeCalls.length;
      }
      expect(totalRoutes).toBe(50);
    });
  });
});
