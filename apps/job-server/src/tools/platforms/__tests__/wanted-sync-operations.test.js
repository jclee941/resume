import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  composeWantedAbout,
  syncAbout,
  syncActivities,
  syncCareers,
} from '../wanted-sync-operations.js';

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
    resume: {
      save: mock.fn(async () => undefined),
    },
  };
}

function getMockArgs(mockFn) {
  return mockFn.mock.calls.map((call) => call.arguments);
}

function createLongProject(index, extra = '') {
  return {
    name: `Project ${index}`,
    tagline: `Tagline ${index}${extra}`,
    description: `Description ${index}${extra}`,
    technologies: ['Node.js', 'Cloudflare Workers', 'PostgreSQL', 'Terraform', 'Grafana'],
    githubUrl: `https://github.com/example/project-${index}`,
  };
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

  it('syncCareers emits one project sync per SSoT sub-project', async () => {
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
          { id: 'project-1', title: 'Core Platform', description: 'Old' },
          { id: 'project-2', title: 'Observability', description: 'Old' },
        ],
      },
    ];
    const ssotCareers = [
      {
        project: 'Career Fallback',
        projects: [
          {
            name: 'Core Platform',
            period: '2022.01 ~ 2022.06',
            achievements: ['Migrated workloads'],
          },
          {
            name: 'Observability',
            period: '2022.07 ~ 2022.12',
            achievements: ['Built dashboards'],
          },
          {
            name: 'Incident Automation',
            period: '2023.01 ~ 2023.06',
            achievements: ['Reduced MTTR'],
          },
        ],
      },
    ];

    await syncCareers(api, 'resume-1', localCareers, remoteCareers, ssotCareers);

    assert.deepStrictEqual(getMockArgs(api.resumeCareer.deleteProject), [
      ['resume-1', 'career-1', 'project-1'],
      ['resume-1', 'career-1', 'project-2'],
    ]);
    assert.strictEqual(api.resumeCareer.addProject.mock.calls.length, 3);
    assert.deepStrictEqual(
      getMockArgs(api.resumeCareer.addProject).map(([, , payload]) => payload.title),
      ['Core Platform', 'Observability', 'Incident Automation']
    );
  });

  it('syncCareers composes project descriptions from period, tech stack, and achievements', async () => {
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
        projects: [],
      },
    ];
    const ssotCareers = [
      {
        projects: [
          {
            name: 'Platform Migration',
            period: '2024.01 ~ 2024.06',
            techStack: ['Node.js', 'Cloudflare Workers', 'PostgreSQL'],
            achievements: ['Migrated 12 services', 'Reduced deploy time by 70%'],
          },
        ],
      },
    ];

    await syncCareers(api, 'resume-1', localCareers, remoteCareers, ssotCareers);

    assert.deepStrictEqual(getMockArgs(api.resumeCareer.addProject), [
      [
        'resume-1',
        'career-1',
        {
          title: 'Platform Migration',
          description:
            '2024.01 ~ 2024.06\nNode.js, Cloudflare Workers, PostgreSQL\n\n- Migrated 12 services\n- Reduced deploy time by 70%',
        },
      ],
    ]);
  });

  it('syncCareers caps composed project descriptions at 2000 characters', async () => {
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
        projects: [],
      },
    ];
    const longAchievement = 'A'.repeat(2105);
    const ssotCareers = [
      {
        projects: [
          {
            name: 'Long Project',
            period: '2024',
            techStack: ['Node.js'],
            achievements: [longAchievement],
          },
        ],
      },
    ];

    await syncCareers(api, 'resume-1', localCareers, remoteCareers, ssotCareers);

    const [, , payload] = getMockArgs(api.resumeCareer.addProject)[0];
    assert.strictEqual(payload.title, 'Long Project');
    assert.strictEqual(payload.description.length, 2000);
    assert.match(payload.description, /^2024\nNode\.js\n\n- A+/);
  });

  it('syncAbout keeps manual override even when personalProjects exist', async () => {
    const api = {
      resume: {
        save: mock.fn(async () => undefined),
      },
    };
    const sourceData = {
      summary: { profileStatement: 'Base summary' },
      platformVariants: { wanted: { about: 'manual' } },
      personalProjects: [createLongProject(1), createLongProject(2), createLongProject(3)],
    };

    await syncAbout(api, 'resume-1', sourceData, 'old about');

    assert.deepStrictEqual(getMockArgs(api.resume.save), [['resume-1', { about: 'manual' }]]);
  });

  it('composeWantedAbout includes the first three personal projects with their taglines', () => {
    const sourceData = {
      summary: { profileStatement: 'Infra automation engineer.' },
      personalProjects: [createLongProject(1), createLongProject(2), createLongProject(3)],
    };

    const about = composeWantedAbout(sourceData);

    assert.match(about, /^Infra automation engineer\.\n\n주요 개인 프로젝트:/);
    assert.match(
      about,
      /Project 1 \(Node\.js, Cloudflare Workers, PostgreSQL, Terraform\): Tagline 1/
    );
    assert.match(
      about,
      /Project 2 \(Node\.js, Cloudflare Workers, PostgreSQL, Terraform\): Tagline 2/
    );
    assert.match(
      about,
      /Project 3 \(Node\.js, Cloudflare Workers, PostgreSQL, Terraform\): Tagline 3/
    );
  });

  it('composeWantedAbout only exposes the first three personal projects', () => {
    const sourceData = {
      summary: { profileStatement: 'Infra automation engineer.' },
      personalProjects: Array.from({ length: 10 }, (_, index) => createLongProject(index + 1)),
    };

    const about = composeWantedAbout(sourceData);

    assert.match(about, /Project 1/);
    assert.match(about, /Project 2/);
    assert.match(about, /Project 3/);
    assert.doesNotMatch(about, /Project 4/);
    assert.doesNotMatch(about, /Project 10/);
  });

  it('composeWantedAbout respects the 3000 character limit', () => {
    const longText = 'A'.repeat(2200);
    const sourceData = {
      summary: { profileStatement: `Summary ${longText}` },
      personalProjects: [
        createLongProject(1, longText),
        createLongProject(2, longText),
        createLongProject(3, longText),
        createLongProject(4, longText),
      ],
    };

    const about = composeWantedAbout(sourceData);

    assert.strictEqual(about.length, 3000);
    assert.match(about, /^Summary A+/);
    assert.match(about, /주요 개인 프로젝트:/);
    assert.match(about, /Project 1/);
    assert.doesNotMatch(about, /Project 2/);
  });

  it('composeWantedAbout falls back to profileStatement when personalProjects are missing', () => {
    const about = composeWantedAbout({
      summary: { profileStatement: 'Profile only summary' },
    });

    assert.strictEqual(about, 'Profile only summary');
  });

  it('syncAbout preserves existing remote about when source has no usable content', async () => {
    const api = {
      resume: {
        save: mock.fn(async () => undefined),
      },
    };

    await syncAbout(api, 'resume-1', {}, 'existing remote about');

    assert.strictEqual(api.resume.save.mock.calls.length, 0);
  });
});
