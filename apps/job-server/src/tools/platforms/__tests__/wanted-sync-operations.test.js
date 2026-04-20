import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { syncActivities, syncCareers } from '../wanted-sync-operations.js';

function createApiMock() {
  return {
    resumeCareer: {
      update: mock.fn(async () => undefined),
      add: mock.fn(async () => ({ data: { id: 'new-career-id' } })),
      delete: mock.fn(async () => undefined),
      addProject: mock.fn(async () => undefined),
      deleteProject: mock.fn(async () => undefined),
    },
    resumeActivity: {
      update: mock.fn(async () => undefined),
      delete: mock.fn(async () => undefined),
      add: mock.fn(async () => undefined),
    },
  };
}

function getMockArgs(mockFn) {
  return mockFn.mock.calls.map((call) => call.arguments);
}

describe('wanted sync operations', () => {
  beforeEach(() => {
    mock.restoreAll();
    delete process.env.SYNC_STRICT;
  });

  it('syncCareers preserves manual remote projects while updating the SSoT-matching project', async () => {
    const api = createApiMock();
    const localCareers = [
      {
        company: { name: 'Wanted Lab' },
        job_role: 'SRE',
      },
    ];
    const remoteCareers = [
      {
        id: 'career-1',
        company: { name: 'Wanted Lab' },
        projects: [
          { id: 'manual-1', title: 'Manual Project A', description: 'Keep me' },
          { id: 'manual-2', title: 'Manual Project B', description: 'Keep me too' },
          { id: 'ssot-1', title: 'Platform Migration', description: 'Old description' },
        ],
      },
    ];
    const ssotCareers = [
      {
        projects: [{ title: 'Platform Migration', description: 'Updated description' }],
      },
    ];

    await syncCareers(api, 'resume-1', localCareers, remoteCareers, ssotCareers);

    assert.strictEqual(api.resumeCareer.update.mock.calls.length, 1);
    assert.deepStrictEqual(getMockArgs(api.resumeCareer.deleteProject), [
      ['resume-1', 'career-1', 'ssot-1'],
    ]);
    assert.deepStrictEqual(getMockArgs(api.resumeCareer.addProject), [
      ['resume-1', 'career-1', { title: 'Platform Migration', description: 'Updated description' }],
    ]);
  });

  it('syncCareers deletes unknown remote projects when SYNC_STRICT=true', async () => {
    process.env.SYNC_STRICT = 'true';

    const api = createApiMock();
    const localCareers = [
      {
        company: { name: 'Wanted Lab' },
        job_role: 'SRE',
      },
    ];
    const remoteCareers = [
      {
        id: 'career-1',
        company: { name: 'Wanted Lab' },
        projects: [
          { id: 'manual-1', title: 'Manual Project A', description: 'Keep me' },
          { id: 'manual-2', title: 'Manual Project B', description: 'Keep me too' },
          { id: 'ssot-1', title: 'Platform Migration', description: 'Old description' },
        ],
      },
    ];
    const ssotCareers = [
      {
        projects: [{ title: 'Platform Migration', description: 'Updated description' }],
      },
    ];

    await syncCareers(api, 'resume-1', localCareers, remoteCareers, ssotCareers);

    assert.deepStrictEqual(getMockArgs(api.resumeCareer.deleteProject), [
      ['resume-1', 'career-1', 'ssot-1'],
      ['resume-1', 'career-1', 'manual-1'],
      ['resume-1', 'career-1', 'manual-2'],
    ]);
    assert.deepStrictEqual(getMockArgs(api.resumeCareer.addProject), [
      ['resume-1', 'career-1', { title: 'Platform Migration', description: 'Updated description' }],
    ]);
  });

  it('syncActivities preserves non-certificate remote activities by default', async () => {
    const api = createApiMock();
    const sourceData = {
      certifications: [
        { name: 'AWS SAA', issuer: 'AWS', date: '2024.01' },
        { name: 'CKA', issuer: 'CNCF', date: '2024.02' },
        { name: 'Terraform Associate', issuer: 'HashiCorp', date: '2024.03' },
      ],
    };
    const remoteActivities = [
      { id: 'cert-1', title: 'AWS SAA', activity_type: 'CERTIFICATE' },
      { id: 'cert-2', title: 'CKA', activity_type: 'CERTIFICATE' },
      { id: 'cert-3', title: 'Terraform Associate', activity_type: 'CERTIFICATE' },
      { id: 'award-1', title: 'Employee Award', activity_type: 'AWARD' },
      { id: 'project-1', title: 'Internal Initiative', activity_type: 'PROJECT' },
    ];

    await syncActivities(api, 'resume-1', sourceData, remoteActivities);

    assert.strictEqual(api.resumeActivity.update.mock.calls.length, 3);
    assert.strictEqual(api.resumeActivity.delete.mock.calls.length, 0);
  });

  it('syncActivities deletes foreign activity types when SYNC_STRICT=true', async () => {
    process.env.SYNC_STRICT = 'true';

    const api = createApiMock();
    const sourceData = {
      certifications: [
        { name: 'AWS SAA', issuer: 'AWS', date: '2024.01' },
        { name: 'CKA', issuer: 'CNCF', date: '2024.02' },
        { name: 'Terraform Associate', issuer: 'HashiCorp', date: '2024.03' },
      ],
    };
    const remoteActivities = [
      { id: 'cert-1', title: 'AWS SAA', activity_type: 'CERTIFICATE' },
      { id: 'cert-2', title: 'CKA', activity_type: 'CERTIFICATE' },
      { id: 'cert-3', title: 'Terraform Associate', activity_type: 'CERTIFICATE' },
      { id: 'award-1', title: 'Employee Award', activity_type: 'AWARD' },
      { id: 'project-1', title: 'Internal Initiative', activity_type: 'PROJECT' },
    ];

    await syncActivities(api, 'resume-1', sourceData, remoteActivities);

    assert.deepStrictEqual(getMockArgs(api.resumeActivity.delete), [
      ['resume-1', 'award-1'],
      ['resume-1', 'project-1'],
    ]);
  });

  it('syncCareers supports legacy single project and description fields', async () => {
    const api = createApiMock();
    const localCareers = [
      {
        company: { name: 'Wanted Lab' },
        job_role: 'SRE',
      },
    ];
    const remoteCareers = [
      {
        id: 'career-1',
        company: { name: 'Wanted Lab' },
        projects: [{ id: 'legacy-1', title: 'Legacy Project', description: 'Before sync' }],
      },
    ];
    const ssotCareers = [
      {
        project: 'Legacy Project',
        description: 'After sync',
      },
    ];

    await syncCareers(api, 'resume-1', localCareers, remoteCareers, ssotCareers);

    assert.deepStrictEqual(getMockArgs(api.resumeCareer.deleteProject), [
      ['resume-1', 'career-1', 'legacy-1'],
    ]);
    assert.deepStrictEqual(getMockArgs(api.resumeCareer.addProject), [
      ['resume-1', 'career-1', { title: 'Legacy Project', description: 'After sync' }],
    ]);
  });
});
