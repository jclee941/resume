const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { generateWebData } = require('../resume-web-data-generator.js');

const ssot = require(
  path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'packages',
    'data',
    'resumes',
    'master',
    'resume_data.json'
  )
);

describe('generateWebData → projects[].fullStackEvidence', () => {
  it('preserves structured full-stack evidence unchanged', () => {
    const evidence = {
      userSurface: 'Next.js admin surface',
      backendApi: 'Workers API',
      architectureSteps: ['admin', 'edge'],
    };
    const source = {
      ...ssot,
      personalProjects: [{ ...ssot.personalProjects[0], fullStackEvidence: evidence }],
    };

    const out = generateWebData(source);

    assert.deepEqual(out.projects[0].fullStackEvidence, evidence);
  });

  it('does not add fallback evidence for omitted capability layers', () => {
    const evidence = {
      backendApi: 'Flask service',
      architectureSteps: ['adapter', 'service'],
    };
    const source = {
      ...ssot,
      personalProjects: [{ ...ssot.personalProjects[0], fullStackEvidence: evidence }],
    };

    const out = generateWebData(source);

    assert.deepEqual(Object.keys(out.projects[0].fullStackEvidence), [
      'backendApi',
      'architectureSteps',
    ]);
    assert.equal(Object.hasOwn(out.projects[0].fullStackEvidence, 'userSurface'), false);
    assert.equal(Object.hasOwn(out.projects[0].fullStackEvidence, 'deliveryOperations'), false);
  });
});
