import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { syncCareers } from '../careers.js';

function createApi(calls) {
  const record =
    (name) =>
    async (...args) => {
      calls.push([name, ...args]);
      return { id: `new-${calls.length}` };
    };
  return {
    resumeCareer: {
      update: record('update'),
      add: record('add'),
      delete: record('delete'),
      addProject: record('addProject'),
      deleteProject: record('deleteProject'),
    },
  };
}

const ssotCareer = {
  company: 'A',
  role: '인프라 엔지니어',
  projects: [{ name: 'P1', period: '2025.03 ~ 2026.02', achievements: ['배포 단계 자동화'] }],
};
const localCareer = { company: { name: 'A', type: 'CUSTOM' } };
const remoteCareer = {
  id: 1,
  company: { name: 'A' },
  projects: [
    { id: 11, title: 'P1' },
    { id: 12, title: 'Old project' },
  ],
};

describe('syncCareers', () => {
  const strict = process.env.SYNC_STRICT;
  afterEach(() => {
    if (strict === undefined) delete process.env.SYNC_STRICT;
    else process.env.SYNC_STRICT = strict;
  });

  it('posts each project with the career role as its job role', async () => {
    const calls = [];

    await syncCareers(createApi(calls), 'R', [localCareer], [remoteCareer], [ssotCareer]);

    const added = calls.filter(([name]) => name === 'addProject');
    assert.deepEqual(
      added.map(([, , careerId, project]) => [careerId, project.title, project.job_role]),
      [[1, 'P1', '인프라 엔지니어']]
    );
  });

  it('deletes projects the SSoT does not have when strict sync is on', async () => {
    process.env.SYNC_STRICT = 'true';
    const calls = [];

    await syncCareers(createApi(calls), 'R', [localCareer], [remoteCareer], [ssotCareer]);

    const deleted = calls.filter(([name]) => name === 'deleteProject').map((call) => call[3]);
    assert.deepEqual(deleted, [11, 12]);
  });

  it('keeps projects the SSoT does not have when strict sync is off', async () => {
    delete process.env.SYNC_STRICT;
    const calls = [];

    await syncCareers(createApi(calls), 'R', [localCareer], [remoteCareer], [ssotCareer]);

    const deleted = calls.filter(([name]) => name === 'deleteProject').map((call) => call[3]);
    assert.deepEqual(deleted, [11]);
  });
});
