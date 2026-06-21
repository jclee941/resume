const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.resolve(__dirname, '../../../apps/job-dashboard/src/routes');
const OPENAPI_PATH = path.resolve(__dirname, '../../../packages/contracts/openapi.yaml');

describe('foreign ATS automation route contract', () => {
  let automationSrc;
  let openApiSrc;

  beforeAll(() => {
    automationSrc = fs.readFileSync(path.join(ROUTES_DIR, 'automation.js'), 'utf8');
    openApiSrc = fs.readFileSync(OPENAPI_PATH, 'utf8');
  });

  test('documents run and status routes with dry-run preview fields', () => {
    console.log('foreign ATS routes');
    expect(automationSrc).toContain("'/api/auto-apply/status'");
    expect(automationSrc).toContain("'/api/auto-apply/run'");
    for (const marker of [
      'greenhouse',
      'lever',
      'ashby',
      'pendingApprovals',
      'approvalMetadata',
      'explicitSubmit',
      'submitOptIn',
      'enum: [dry-run]',
    ]) {
      expect(openApiSrc).toContain(marker);
    }
  });
});
