import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  composeWantedAbout,
  mapToWantedFormat,
  syncAbout,
  syncActivities,
  syncCareers,
  WANTED_HEADLINE_LIMIT,
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

describe('mapToWantedFormat — BUG-W2 headline truncation', () => {
  it('uses WANTED_HEADLINE_LIMIT (150) instead of legacy 50-char truncation', () => {
    const longHeadline =
      'DevSecOps/SRE | 금융위 본인가 통과 보안 아키텍쳐 설계 | FortiGate HA · Splunk · Terraform · AWS | 9년';
    assert.ok(longHeadline.length > 50, 'fixture must exceed 50');
    assert.ok(longHeadline.length <= WANTED_HEADLINE_LIMIT, 'fixture must fit within 150');
    const result = mapToWantedFormat({
      platformVariants: { wanted: { headline: longHeadline } },
      careers: [],
      summary: {},
    });
    assert.strictEqual(
      result.profile.headline,
      longHeadline,
      'full headline preserved when within 150'
    );
    assert.strictEqual(result.profile.headline.length, longHeadline.length);
  });

  it('truncates at 150 when input exceeds limit', () => {
    const oversized = 'X'.repeat(WANTED_HEADLINE_LIMIT + 50);
    const result = mapToWantedFormat({
      platformVariants: { wanted: { headline: oversized } },
      careers: [],
      summary: {},
    });
    assert.strictEqual(result.profile.headline.length, WANTED_HEADLINE_LIMIT);
  });
});

// Failing tests for identified Wanted gaps (Plan Agent: fill missing fields)
describe('Wanted gap — skills level', () => {
  it('mapToWantedFormat includes skill levels', () => {
    const result = mapToWantedFormat({
      skills: {
        observability: { items: [{ name: 'Prometheus', level: 'Advanced' }] },
      },
      careers: [],
      summary: {},
    });
    const skill = result.profile.skills?.find((s) => s.name === 'Prometheus');
    assert.ok(skill, 'should include Prometheus skill');
    assert.strictEqual(skill.level, 'Advanced', 'should preserve skill level');
  });
});

describe('Wanted gap — certification extra fields', () => {
  it('syncActivities syncs certification expirationDate, credentialId, credentialUrl, status, note', async () => {
    const api = createApiMock();
    const sourceData = {
      certifications: [
        {
          name: 'AWS SAA',
          issuer: 'AWS',
          date: '2024.01',
          expirationDate: '2027.01',
          credentialId: 'ABC123',
          credentialUrl: 'https://aws.amazon.com/cert',
          status: 'active',
          note: 'Note',
        },
      ],
    };
    const remoteActivities = [];
    await syncActivities(api, 'resume-1', sourceData, remoteActivities);
    const args = getMockArgs(api.resumeActivity.add);
    assert.strictEqual(args.length, 1);
    const payload = args[0][1];
    assert.strictEqual(payload.expirationDate, '2027.01', 'should map expirationDate');
    assert.strictEqual(payload.credentialId, 'ABC123', 'should map credentialId');
    assert.strictEqual(
      payload.credentialUrl,
      'https://aws.amazon.com/cert',
      'should map credentialUrl'
    );
    assert.strictEqual(payload.status, 'active', 'should map status');
    assert.strictEqual(payload.note, 'Note', 'should map note');
  });
});

describe('Wanted gap — languages note', () => {
  it('mapToWantedFormat includes languages with notes', () => {
    const result = mapToWantedFormat({
      languages: [{ name: 'English', level: '비즈니스 회화가능', note: 'TOEIC 900' }],
      careers: [],
      summary: {},
    });
    assert.ok(Array.isArray(result.profile.languages), 'should include languages array');
    const lang = result.profile.languages.find((l) => l.name === 'English');
    assert.ok(lang, 'should include English');
    assert.strictEqual(lang.note, 'TOEIC 900', 'should preserve language note');
  });
});

describe('Wanted gap — awards', () => {
  it('syncActivities syncs awards from SSoT as AWARD activities', async () => {
    const api = createApiMock();
    const sourceData = {
      certifications: [],
      awards: [{ name: '우수상', organization: '한양사이버대학교', year: '2026' }],
    };
    const remoteActivities = [];
    await syncActivities(api, 'resume-1', sourceData, remoteActivities);
    const args = getMockArgs(api.resumeActivity.add);
    assert.ok(args.length > 0, 'should add award activities');
    const payload = args[0][1];
    assert.strictEqual(payload.title, '우수상', 'should map award name');
    assert.strictEqual(payload.activity_type, 'AWARD', 'should set activity type to AWARD');
  });
});

describe('Wanted gap — career description fallback', () => {
  it('syncCareers syncs career description even when no projects exist', async () => {
    const api = createApiMock();
    const localCareers = [{ company: { name: 'Wanted Lab' }, job_role: 'SRE' }];
    const remoteCareers = [{ id: 'career-1', company: { name: 'Wanted Lab' }, projects: [] }];
    const ssotCareers = [{ description: 'Security operations and automation' }];
    await syncCareers(api, 'resume-1', localCareers, remoteCareers, ssotCareers);
    const args = getMockArgs(api.resumeCareer.addProject);
    assert.ok(args.length > 0, 'should add a fallback project from description');
    const payload = args[0][2];
    assert.ok(
      payload.description.includes('Security operations and automation'),
      'should include career description'
    );
  });
});

describe('Wanted gap — hope job', () => {
  it('mapToWantedFormat includes hope locations, roles, salary, and industries', () => {
    const result = mapToWantedFormat({
      hope: {
        locations: ['서울'],
        roles: ['보안 엔지니어'],
        salary: '5000만원 이상',
        industries: ['금융'],
      },
      careers: [],
      summary: {},
    });
    assert.ok(result.profile.hope, 'should include hope object');
    assert.deepStrictEqual(result.profile.hope.locations, ['서울'], 'should map locations');
    assert.deepStrictEqual(result.profile.hope.roles, ['보안 엔지니어'], 'should map roles');
    assert.strictEqual(result.profile.hope.salary, '5000만원 이상', 'should map salary');
    assert.deepStrictEqual(result.profile.hope.industries, ['금융'], 'should map industries');
  });
});

describe('Wanted gap — cover letter', () => {
  it('mapToWantedFormat includes cover letter', () => {
    const result = mapToWantedFormat({
      coverLetter: {
        ko: { headline: 'Headline', paragraphs: ['P1', 'P2'], closing: 'Closing' },
      },
      careers: [],
      summary: {},
    });
    assert.ok(result.profile.coverLetter, 'should include coverLetter');
    assert.strictEqual(result.profile.coverLetter.headline, 'Headline', 'should map headline');
  });
});

describe('Wanted gap — GitHub/LinkedIn/portfolio URLs', () => {
  it('mapToWantedFormat includes GitHub, LinkedIn, and portfolio URLs', () => {
    const result = mapToWantedFormat({
      personal: {
        github: 'https://github.com/jclee941',
        linkedin: 'https://linkedin.com/in/jclee941',
        portfolio: 'https://resume.jclee.me',
      },
      careers: [],
      summary: {},
    });
    assert.strictEqual(
      result.profile.githubUrl,
      'https://github.com/jclee941',
      'should map github'
    );
    assert.strictEqual(
      result.profile.linkedinUrl,
      'https://linkedin.com/in/jclee941',
      'should map linkedin'
    );
    assert.strictEqual(
      result.profile.portfolioUrl,
      'https://resume.jclee.me',
      'should map portfolio'
    );
  });
});

describe('Wanted gap — personal fields', () => {
  it('mapToWantedFormat includes birthDate and address', () => {
    const result = mapToWantedFormat({
      personal: { birthDate: '1994-05-07', address: 'Seoul' },
      careers: [],
      summary: {},
    });
    assert.strictEqual(result.profile.birthDate, '1994-05-07', 'should map birthDate');
    assert.strictEqual(result.profile.address, 'Seoul', 'should map address');
  });
});
