const fs = require('fs');
const path = require('path');

// CF-native migration Wave 1 guard: the resume-sync Cron Trigger is declared in two
// places that must not drift — the RESUME_SYNC_CRON constant in the worker's
// scheduled() dispatch, and the triggers.crons array in wrangler.jsonc. If they
// diverge, the scheduled() branch silently never matches and resume-sync never runs.
const root = path.join(__dirname, '../..');
const wranglerRaw = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
const cronRouterRaw = fs.readFileSync(
  path.join(root, 'apps/job-dashboard/src/handlers/scheduled/cron-router.js'),
  'utf8'
);

const AUTO_APPLY_CRON = '0 23 * * *';

function extractResumeSyncCron(src) {
  const m = src.match(/RESUME_SYNC_CRON\s*=\s*'([^']+)'/);
  return m ? m[1] : null;
}

function cronArrays(src) {
  return [...src.matchAll(/"crons"\s*:\s*\[([^\]]*)\]/g)].map((m) => m[1]);
}

describe('resume-sync cron wiring (CF-native Wave 1)', () => {
  const resumeSyncCron = extractResumeSyncCron(cronRouterRaw);
  const crons = cronArrays(wranglerRaw).join(' | ');

  test('index.js declares a RESUME_SYNC_CRON constant', () => {
    expect(resumeSyncCron).toBeTruthy();
    expect(resumeSyncCron).toMatch(/^[\d*/, -]+$/);
  });

  test('wrangler.jsonc crons preserve the auto-apply cron', () => {
    expect(crons).toContain(AUTO_APPLY_CRON);
  });

  test('wrangler.jsonc crons include the resume-sync cron (no drift vs index.js)', () => {
    expect(crons).toContain(resumeSyncCron);
  });

  test('the resume-sync branch is guarded and defaults to dryRun', () => {
    expect(cronRouterRaw).toContain('controller?.cron === RESUME_SYNC_CRON');
    expect(cronRouterRaw).toContain('RESUME_SYNC_WORKFLOW');
    expect(cronRouterRaw).toContain('RESUME_SYNC_CRON_DRY_RUN');
  });
});
