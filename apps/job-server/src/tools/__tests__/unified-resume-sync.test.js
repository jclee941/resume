import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { unifiedResumeSyncTool } from '../unified-resume-sync.js';
import { SessionManager } from '../auth.js';

const BASE_RESUME_DATA = {
  current: { position: 'DevOps Engineer', company: 'TestCorp' },
  summary: { totalExperience: '5년', expertise: ['AWS', 'K8s'] },
  careers: [
    {
      company: 'TestCorp',
      role: 'DevOps Engineer',
      period: '2020.03 ~ 현재',
      project: 'Infrastructure',
      description: 'Cloud infra management',
    },
  ],
  education: {
    school: 'Test University',
    major: 'Computer Science',
    startDate: '2016.03',
    status: '재학중',
  },
  skills: {
    security: { items: ['Python', 'Docker'] },
    cloud: { items: ['AWS', 'Kubernetes'] },
    automation: { items: ['Jenkins', 'Terraform'] },
  },
  personal: { name: 'Test User', email: 'test@test.com', phone: '010-1234-5678' },
  certifications: [{ name: 'AWS SAA', issuer: 'Amazon', date: '2023.01' }],
};

const SKILL_TAG_MAP_ENTRIES = {
  Python: 1554,
  JavaScript: 1541,
  TypeScript: 1564,
  Docker: 2217,
  Kubernetes: 10268,
  Terraform: 10498,
  Prometheus: 10497,
  Grafana: 10496,
  AWS: 1698,
  GCP: 3468,
  Linux: 1459,
  'Node.js': 1547,
  React: 1469,
  PostgreSQL: 2683,
  Git: 1411,
  Jenkins: 2020,
  Go: 1702,
  Bash: 2271,
  Nginx: 3498,
  Redis: 1470,
  MongoDB: 1462,
  Azure: 1441,
  Helm: 10648,
  RabbitMQ: 3569,
};

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function mockResumeFile(data) {
  mock.method(fs, 'existsSync', () => true);
  mock.method(fs, 'readFileSync', () => JSON.stringify(data));
  syncBuiltinESMExports();
}

function mockMissingResumeFile() {
  mock.method(fs, 'existsSync', () => false);
  syncBuiltinESMExports();
}

function buildResumeWithSkills(skillNames) {
  const data = clone(BASE_RESUME_DATA);
  data.skills = {
    security: { items: skillNames },
    cloud: { items: [] },
    automation: { items: [] },
  };
  return data;
}

describe('unifiedResumeSyncTool', () => {
  beforeEach(() => {
    mock.restoreAll();
    syncBuiltinESMExports();
  });

  it('maps preview wanted format including parseDate-derived fields', async () => {
    mockResumeFile(clone(BASE_RESUME_DATA));

    const result = await unifiedResumeSyncTool.execute({
      action: 'preview',
      platforms: ['wanted'],
    });

    assert.strictEqual(result.success, true);
    const wanted = result.preview.wanted;

    assert.ok(wanted.profile.headline.includes('DevOps Engineer'));
    assert.ok(wanted.profile.headline.includes('5년'));

    assert.strictEqual(wanted.careers[0].company_name, 'TestCorp');
    assert.strictEqual(wanted.careers[0].title, 'DevOps Engineer');
    assert.strictEqual(wanted.careers[0].start_time, '2020-03-01');
    assert.strictEqual(wanted.careers[0].end_time, null);

    assert.strictEqual(wanted.educations[0].degree, null);
    assert.strictEqual(wanted.educations[0].school_name, 'Test University');
    assert.ok(wanted.educations[0].description.includes('재학중'));

    assert.deepStrictEqual(wanted.skills, [
      'Python',
      'Docker',
      'AWS',
      'Kubernetes',
      'Jenkins',
      'Terraform',
    ]);
  });

  it('handles parseDate edge behavior through preview output', async () => {
    const data = clone(BASE_RESUME_DATA);
    data.careers = [
      {
        company: 'LegacyCorp',
        role: 'Engineer',
        period: '2020.03 ~ 2021.3',
        project: 'Legacy Migration',
        description: 'Migration work',
      },
    ];
    data.education.startDate = null;

    mockResumeFile(data);

    const result = await unifiedResumeSyncTool.execute({
      action: 'preview',
      platforms: ['wanted'],
    });

    const wanted = result.preview.wanted;
    assert.strictEqual(wanted.careers[0].start_time, '2020-03-01');
    assert.strictEqual(wanted.careers[0].end_time, '2021-03-01');
    assert.strictEqual(wanted.educations[0].start_time, null);
  });

  it('flattens skills and caps wanted preview skills to 20', async () => {
    const manySkills = Array.from({ length: 25 }, (_, i) => `Skill-${i + 1}`);
    const data = clone(BASE_RESUME_DATA);
    data.skills = {
      security: { items: manySkills.slice(0, 10) },
      cloud: { items: manySkills.slice(10, 20) },
      automation: { items: manySkills.slice(20) },
    };

    mockResumeFile(data);

    const result = await unifiedResumeSyncTool.execute({
      action: 'preview',
      platforms: ['wanted'],
    });

    assert.strictEqual(result.preview.wanted.skills.length, 20);
    assert.deepStrictEqual(result.preview.wanted.skills, manySkills.slice(0, 20));
  });

  it('returns error for unknown action', async () => {
    mockResumeFile(clone(BASE_RESUME_DATA));

    const result = await unifiedResumeSyncTool.execute({ action: 'unknown' });

    assert.deepStrictEqual(result, {
      success: false,
      error: 'Unknown action: unknown',
    });
  });

  it('returns error when source resume_data.json is missing', async () => {
    mockMissingResumeFile();

    const result = await unifiedResumeSyncTool.execute({ action: 'preview' });

    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('Source not found:'));
  });

  it('dispatches status action and checks wanted auth status', async () => {
    mockResumeFile(clone(BASE_RESUME_DATA));

    const getResumes = mock.fn(async () => [{ id: 'resume-1', title: 'Main Resume' }]);
    const getAPI = mock.method(SessionManager, 'getAPI', async () => ({ getResumes }));

    const result = await unifiedResumeSyncTool.execute({
      action: 'status',
      platforms: ['wanted'],
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platforms.wanted.authenticated, true);
    assert.deepStrictEqual(result.platforms.wanted.resumes, [
      { id: 'resume-1', title: 'Main Resume' },
    ]);
    assert.strictEqual(getAPI.mock.calls.length, 1);
    assert.strictEqual(getResumes.mock.calls.length, 1);
  });

  it('returns sync error when resume_id is missing', async () => {
    mockResumeFile(clone(BASE_RESUME_DATA));

    const result = await unifiedResumeSyncTool.execute({
      action: 'sync',
      platforms: ['wanted'],
    });

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.results.wanted, {
      error: 'resume_id required for Wanted sync',
    });
  });

  it('returns sync error when not authenticated', async () => {
    mockResumeFile(clone(BASE_RESUME_DATA));
    mock.method(SessionManager, 'getAPI', async () => null);

    const result = await unifiedResumeSyncTool.execute({
      action: 'sync',
      platforms: ['wanted'],
      resume_id: 'resume-1',
    });

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.results.wanted, {
      error: 'Not authenticated. Use wanted_auth first.',
    });
  });

  it('returns dry_run payload without mutation API calls', async () => {
    mockResumeFile(clone(BASE_RESUME_DATA));

    const updateProfile = mock.fn(async () => undefined);
    const getResumeDetail = mock.fn(async () => ({ careers: [], educations: [], skills: [] }));
    const resumeCareerUpdate = mock.fn(async () => undefined);
    const resumeCareerAdd = mock.fn(async () => undefined);
    const resumeEducationUpdate = mock.fn(async () => undefined);
    const resumeEducationAdd = mock.fn(async () => undefined);
    const resumeSkillsAdd = mock.fn(async () => undefined);

    const mockApi = {
      updateProfile,
      getResumeDetail,
      resumeCareer: { update: resumeCareerUpdate, add: resumeCareerAdd, delete: mock.fn(async () => undefined), addProject: mock.fn(async () => undefined), deleteProject: mock.fn(async () => undefined) },
      resumeEducation: { update: resumeEducationUpdate, add: resumeEducationAdd },
      resumeSkills: { add: resumeSkillsAdd },
    };

    mock.method(SessionManager, 'getAPI', async () => mockApi);

    const result = await unifiedResumeSyncTool.execute({
      action: 'sync',
      platforms: ['wanted'],
      resume_id: 'resume-1',
      dry_run: true,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.results.wanted.dry_run, true);
    assert.ok(result.results.wanted.would_sync.profile);
    assert.strictEqual(updateProfile.mock.calls.length, 0);
    assert.strictEqual(getResumeDetail.mock.calls.length, 0);
    assert.strictEqual(resumeCareerUpdate.mock.calls.length, 0);
    assert.strictEqual(resumeCareerAdd.mock.calls.length, 0);
    assert.strictEqual(resumeEducationUpdate.mock.calls.length, 0);
    assert.strictEqual(resumeEducationAdd.mock.calls.length, 0);
    assert.strictEqual(resumeSkillsAdd.mock.calls.length, 0);
  });

  it('syncs careers, educations, and mapped skills while skipping unknown skills', async () => {
    const data = clone(BASE_RESUME_DATA);
    data.careers = [
      {
        company: 'TestCorp',
        role: 'DevOps Engineer',
        period: '2020.03 ~ 현재',
        project: 'Platform',
        description: 'Core platform work',
      },
      {
        company: 'NewCorp',
        role: 'SRE',
        period: '2022.01 ~ 현재',
        project: 'Reliability',
        description: 'SRE ownership',
      },
    ];
    data.skills = {
      security: { items: ['Python', 'Docker', 'UnknownSkill'] },
      cloud: { items: [] },
      automation: { items: [] },
    };

    mockResumeFile(data);

    const updateProfile = mock.fn(async () => undefined);
    const getResumeDetail = mock.fn(async () => ({
      careers: [{ id: 'career-1', company: { name: 'TestCorp' }, projects: [{ id: 'proj-1', title: 'Old Project' }] }],
      educations: [],
      skills: [{ name: 'Python' }],
    }));
    const resumeCareerUpdate = mock.fn(async () => undefined);
    const resumeCareerAdd = mock.fn(async () => undefined);
    const resumeEducationUpdate = mock.fn(async () => undefined);
    const resumeEducationAdd = mock.fn(async () => undefined);
    const resumeSkillsAdd = mock.fn(async () => undefined);

    const mockApi = {
      updateProfile,
      getResumeDetail,
      resumeCareer: { update: resumeCareerUpdate, add: resumeCareerAdd, delete: mock.fn(async () => undefined), addProject: mock.fn(async () => undefined), deleteProject: mock.fn(async () => undefined) },
      resumeEducation: { update: resumeEducationUpdate, add: resumeEducationAdd },
      resumeSkills: { add: resumeSkillsAdd },
    };

    mock.method(SessionManager, 'getAPI', async () => mockApi);

    const result = await unifiedResumeSyncTool.execute({
      action: 'sync',
      platforms: ['wanted'],
      resume_id: 'resume-1',
    });

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.results.wanted.updated, [
      'profile',
      'careers',
      'educations',
      'skills',
    ]);

    assert.strictEqual(updateProfile.mock.calls.length, 1);
    assert.strictEqual(getResumeDetail.mock.calls.length, 1);

    assert.strictEqual(resumeCareerUpdate.mock.calls.length, 1);
    assert.strictEqual(resumeCareerUpdate.mock.calls[0].arguments[1], 'career-1');
    assert.strictEqual(resumeCareerAdd.mock.calls.length, 1);

    assert.strictEqual(resumeEducationUpdate.mock.calls.length, 0);
    assert.strictEqual(resumeEducationAdd.mock.calls.length, 1);

    assert.strictEqual(resumeSkillsAdd.mock.calls.length, 1);
    assert.deepStrictEqual(resumeSkillsAdd.mock.calls[0].arguments, [
      'resume-1',
      { tag_type_id: 2217, text: 'Docker' },
    ]);
  });

  it('covers all 24 SKILL_TAG_MAP entries through sync calls', async () => {
    const allSkills = Object.keys(SKILL_TAG_MAP_ENTRIES);
    const chunks = [allSkills.slice(0, 12), allSkills.slice(12)];

    const observed = new Map();

    for (const chunk of chunks) {
      mock.restoreAll();
      syncBuiltinESMExports();

      mockResumeFile(buildResumeWithSkills(chunk));

      const resumeSkillsAdd = mock.fn(async (_resumeId, body) => {
        observed.set(body.text, body.tag_type_id);
      });

      const mockApi = {
        updateProfile: mock.fn(async () => undefined),
        getResumeDetail: mock.fn(async () => ({ careers: [], educations: [], skills: [] })),
        resumeCareer: {
          update: mock.fn(async () => undefined),
          add: mock.fn(async () => undefined),
          delete: mock.fn(async () => undefined),
          addProject: mock.fn(async () => undefined),
          deleteProject: mock.fn(async () => undefined),
        },
        resumeEducation: {
          update: mock.fn(async () => undefined),
          add: mock.fn(async () => undefined),
        },
        resumeSkills: { add: resumeSkillsAdd },
      };

      mock.method(SessionManager, 'getAPI', async () => mockApi);

      const result = await unifiedResumeSyncTool.execute({
        action: 'sync',
        platforms: ['wanted'],
        resume_id: 'resume-1',
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(resumeSkillsAdd.mock.calls.length, chunk.length);
    }

    assert.strictEqual(observed.size, 24);
    for (const [skill, expectedTag] of Object.entries(SKILL_TAG_MAP_ENTRIES)) {
      assert.strictEqual(observed.get(skill), expectedTag);
    }
  });

  it('deletes stale remote careers not in SSoT', async () => {
    const data = clone(BASE_RESUME_DATA);
    data.careers = [
      {
        company: 'TestCorp',
        role: 'DevOps Engineer',
        period: '2020.03 ~ 현재',
        project: 'Platform',
        description: 'Core platform work',
      },
    ];
    mockResumeFile(data);

    const resumeCareerUpdate = mock.fn(async () => undefined);
    const resumeCareerAdd = mock.fn(async () => undefined);
    const resumeCareerDelete = mock.fn(async () => undefined);

    const mockApi = {
      updateProfile: mock.fn(async () => undefined),
      getResumeDetail: mock.fn(async () => ({
        careers: [
          { id: 'career-1', company: { name: 'TestCorp' } },
          { id: 'career-stale', company: { name: 'StaleCorp' } },
        ],
        educations: [],
        skills: [],
      })),
      resumeCareer: { update: resumeCareerUpdate, add: resumeCareerAdd, delete: resumeCareerDelete, addProject: mock.fn(async () => undefined), deleteProject: mock.fn(async () => undefined) },
      resumeEducation: { update: mock.fn(async () => undefined), add: mock.fn(async () => undefined) },
      resumeSkills: { add: mock.fn(async () => undefined) },
    };

    mock.method(SessionManager, 'getAPI', async () => mockApi);

    const result = await unifiedResumeSyncTool.execute({
      action: 'sync',
      platforms: ['wanted'],
      resume_id: 'resume-1',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(resumeCareerUpdate.mock.calls.length, 1);
    assert.strictEqual(resumeCareerAdd.mock.calls.length, 0);
    assert.strictEqual(resumeCareerDelete.mock.calls.length, 1);
    assert.strictEqual(resumeCareerDelete.mock.calls[0].arguments[1], 'career-stale');
  });

  it('normalizes (주) in company names for career matching', async () => {
    const data = clone(BASE_RESUME_DATA);
    data.careers = [
      {
        company: '(주)아이티센 CTS',
        role: '보안운영 담당',
        period: '2025.03 ~ 2026.02',
        project: 'Security Ops',
        description: 'Security operations',
      },
    ];
    mockResumeFile(data);

    const resumeCareerUpdate = mock.fn(async () => undefined);
    const resumeCareerAdd = mock.fn(async () => undefined);
    const resumeCareerDelete = mock.fn(async () => undefined);

    const mockApi = {
      updateProfile: mock.fn(async () => undefined),
      getResumeDetail: mock.fn(async () => ({
        careers: [{ id: 'career-itcen', company: { name: '아이티센 CTS' } }],
        educations: [],
        skills: [],
      })),
      resumeCareer: { update: resumeCareerUpdate, add: resumeCareerAdd, delete: resumeCareerDelete, addProject: mock.fn(async () => undefined), deleteProject: mock.fn(async () => undefined) },
      resumeEducation: { update: mock.fn(async () => undefined), add: mock.fn(async () => undefined) },
      resumeSkills: { add: mock.fn(async () => undefined) },
    };

    mock.method(SessionManager, 'getAPI', async () => mockApi);

    const result = await unifiedResumeSyncTool.execute({
      action: 'sync',
      platforms: ['wanted'],
      resume_id: 'resume-1',
    });

    assert.strictEqual(result.success, true);
    // Should match via normalized name, so update not add
    assert.strictEqual(resumeCareerUpdate.mock.calls.length, 1);
    assert.strictEqual(resumeCareerUpdate.mock.calls[0].arguments[1], 'career-itcen');
    assert.strictEqual(resumeCareerAdd.mock.calls.length, 0);
    assert.strictEqual(resumeCareerDelete.mock.calls.length, 0);
  });

  it('syncs career projects: deletes existing and adds SSoT project', async () => {
    const data = clone(BASE_RESUME_DATA);
    data.careers = [
      {
        company: 'TestCorp',
        role: 'DevOps Engineer',
        period: '2020.03 ~ 현재',
        project: 'Platform Infrastructure',
        description: 'Cloud infra management and CI/CD pipeline',
      },
    ];
    mockResumeFile(data);

    const resumeCareerUpdate = mock.fn(async () => undefined);
    const resumeCareerAddProject = mock.fn(async () => undefined);
    const resumeCareerDeleteProject = mock.fn(async () => undefined);

    const mockApi = {
      updateProfile: mock.fn(async () => undefined),
      getResumeDetail: mock.fn(async () => ({
        careers: [
          {
            id: 'career-1',
            company: { name: 'TestCorp' },
            projects: [
              { id: 'proj-old-1', title: 'STAR Project', description: '【Situation】...' },
              { id: 'proj-old-2', title: 'Another', description: 'AI-generated' },
            ],
          },
        ],
        educations: [],
        skills: [],
      })),
      resumeCareer: {
        update: resumeCareerUpdate,
        add: mock.fn(async () => undefined),
        delete: mock.fn(async () => undefined),
        addProject: resumeCareerAddProject,
        deleteProject: resumeCareerDeleteProject,
      },
      resumeEducation: { update: mock.fn(async () => undefined), add: mock.fn(async () => undefined) },
      resumeSkills: { add: mock.fn(async () => undefined) },
    };

    mock.method(SessionManager, 'getAPI', async () => mockApi);

    const result = await unifiedResumeSyncTool.execute({
      action: 'sync',
      platforms: ['wanted'],
      resume_id: 'resume-1',
    });

    assert.strictEqual(result.success, true);
    // Should delete both existing projects
    assert.strictEqual(resumeCareerDeleteProject.mock.calls.length, 2);
    assert.strictEqual(resumeCareerDeleteProject.mock.calls[0].arguments[2], 'proj-old-1');
    assert.strictEqual(resumeCareerDeleteProject.mock.calls[1].arguments[2], 'proj-old-2');
    // Should add SSoT project
    assert.strictEqual(resumeCareerAddProject.mock.calls.length, 1);
    assert.deepStrictEqual(resumeCareerAddProject.mock.calls[0].arguments[2], {
      title: 'Platform Infrastructure',
      description: 'Cloud infra management and CI/CD pipeline',
    });
  });
});
