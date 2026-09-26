const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

// The session-broker image provides Playwright's browsers through
// PLAYWRIGHT_BROWSERS_PATH, so its tag must match the playwright package that
// npm ci installs from the lockfile; a mismatch fails every browser launch.
test('session-broker image tag matches the locked playwright version', () => {
  const dockerfile = fs.readFileSync(
    path.join(ROOT, 'infrastructure/docker/session-broker.Dockerfile'),
    'utf8'
  );
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));

  const imageVersion = dockerfile.match(/^FROM mcr\.microsoft\.com\/playwright:v([\d.]+)-/m)?.[1];

  expect(imageVersion).toBe(lock.packages['node_modules/playwright'].version);
});
