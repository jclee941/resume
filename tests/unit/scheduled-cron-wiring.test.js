const fs = require('fs');
const path = require('path');

// The Cron Triggers are declared in two places that must not drift: the exported
// *_CRON constants in the worker's scheduled() router, and the production
// triggers.crons array in wrangler.jsonc. If they diverge, a scheduled() branch
// silently never matches (or a declared cron is ignored).
const root = path.join(__dirname, '../..');
const wranglerRaw = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
const cronRouterRaw = fs.readFileSync(
  path.join(root, 'apps/job-dashboard/src/handlers/scheduled/cron-router.js'),
  'utf8'
);

function extractCronConstants(src) {
  return [...src.matchAll(/export const (\w+_CRON)\s*=\s*'([^']+)'/g)].map((m) => ({
    name: m[1],
    value: m[2],
  }));
}

function productionCrons(src) {
  const match = src.match(/"crons"\s*:\s*\[([^\]]*)\]/);
  return match ? [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
}

describe('scheduled cron wiring', () => {
  const constants = extractCronConstants(cronRouterRaw);
  const constantValues = constants.map((c) => c.value);
  const declared = productionCrons(wranglerRaw);

  test('cron-router.js exports the resume-sync, health-check and weekly-report crons', () => {
    expect(constants.map((c) => c.name).sort()).toEqual([
      'HEALTH_CHECK_CRON',
      'RESUME_SYNC_CRON',
      'WEEKLY_REPORT_CRON',
    ]);
    for (const value of constantValues) expect(value).toMatch(/^[\d*/, -]+$/);
    expect(new Set(constantValues).size).toBe(constantValues.length);
  });

  test('every declared production cron has an exported constant', () => {
    expect(declared.filter((cron) => !constantValues.includes(cron))).toEqual([]);
  });

  test('every exported cron constant is declared in wrangler.jsonc production crons', () => {
    expect(constantValues.filter((cron) => !declared.includes(cron))).toEqual([]);
  });

  test('production crons are unique', () => {
    expect(new Set(declared).size).toBe(declared.length);
  });

  test('the resume-sync branch is guarded and defaults to dryRun', () => {
    expect(cronRouterRaw).toContain('cron === RESUME_SYNC_CRON');
    expect(cronRouterRaw).toContain('RESUME_SYNC_WORKFLOW');
    expect(cronRouterRaw).toContain('RESUME_SYNC_CRON_DRY_RUN');
    expect(cronRouterRaw).toContain("?? 'true'");
  });
});
