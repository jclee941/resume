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

  it('keeps two stints at one company as separate careers', async () => {
    const calls = [];
    const stints = [
      { company: { name: 'A', type: 'CUSTOM' }, start_time: '2024-03-01' },
      { company: { name: 'A', type: 'CUSTOM' }, start_time: '2017-01-01' },
    ];
    const remote = [{ id: 1, company: { name: 'A' }, start_time: '2017-01-01', projects: [] }];

    await syncCareers(createApi(calls), 'R', stints, remote, [{}, {}]);

    assert.deepEqual(
      calls.filter(([name]) => ['add', 'update', 'delete'].includes(name)),
      [
        ['add', 'R', stints[0]],
        ['update', 'R', 1, stints[1]],
      ]
    );
  });

  it('titles a career without a project name after its department', async () => {
    const calls = [];
    const career = {
      company: 'B',
      role: '백엔드 개발자',
      department: '백엔드팀',
      description: '근무',
    };

    await syncCareers(createApi(calls), 'R', [{ company: { name: 'B' } }], [], [career]);

    const titles = calls.filter(([name]) => name === 'addProject').map((call) => call[3].title);
    assert.deepEqual(titles, ['백엔드팀']);
  });

  it('finds a career added without an id on a re-read and posts its projects', async () => {
    const calls = [];
    const api = createApi(calls);
    api.resumeCareer.add = async (...args) => {
      calls.push(['add', ...args]);
      return {};
    };
    api.getResumeDetail = async () => ({
      careers: [{ id: 9, company: { name: 'A' }, start_time: '2024-03-01', projects: [] }],
    });
    const added = { company: { name: 'A', type: 'CUSTOM' }, start_time: '2024-03-01' };

    await syncCareers(api, 'R', [added], [], [ssotCareer]);

    const projects = calls
      .filter(([name]) => name === 'addProject')
      .map((call) => [call[2], call[3].title]);
    assert.deepEqual(projects, [[9, 'P1']]);
  });

  it('fails when an added career is missing from the re-read resume', async () => {
    const api = createApi([]);
    api.resumeCareer.add = async () => ({});
    api.getResumeDetail = async () => ({ careers: [] });
    const added = { company: { name: 'A', type: 'CUSTOM' }, start_time: '2024-03-01' };

    await assert.rejects(syncCareers(api, 'R', [added], [], [ssotCareer]), /missing/);
  });
});
