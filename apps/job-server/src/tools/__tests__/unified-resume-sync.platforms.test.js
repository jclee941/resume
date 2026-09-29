import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { SessionManager } from '../../shared/services/session/index.js';
import { syncToWanted } from '../platforms/wanted-sync.js';
import { syncToJobKorea } from '../platforms/jobkorea-sync.js';
import { syncToRemember } from '../platforms/remember-sync.js';

describe('unified resume sync platform modules', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('syncs wanted in isolation with mocked API', async () => {
    const updateProfile = mock.fn(async () => undefined);
    const getResumeDetail = mock.fn(async () => ({
      careers: [],
      educations: [],
      skills: [],
      activities: [],
      language_certs: [],
      about: '',
      email: 'old@test.com',
      mobile: '010-0000-0000',
    }));
    const resumeSave = mock.fn(async () => undefined);

    mock.method(SessionManager, 'getAPI', async () => ({
      updateProfile,
      getResumeDetail,
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
      resumeSkills: { add: mock.fn(async () => undefined) },
      resumeActivity: {
        add: mock.fn(async () => undefined),
        update: mock.fn(async () => undefined),
        delete: mock.fn(async () => undefined),
      },
      resumeLanguageCert: {
        add: mock.fn(async () => undefined),
        update: mock.fn(async () => undefined),
        delete: mock.fn(async () => undefined),
      },
      resume: { save: resumeSave },
    }));

    const result = await syncToWanted(
      {
        profile: { headline: 'DevOps Engineer', description: 'AWS, K8s' },
        careers: [],
        educations: [],
        skills: [],
      },
      { resume_id: 'resume-1', dry_run: false },
      {
        personal: { email: 'new@test.com', phone: '010-1234-5678' },
        summary: { profileStatement: 'about' },
      }
    );

    assert.deepStrictEqual(result.updated, [
      'profile',
      'careers',
      'educations',
      'skills',
      'activities',
      'language_certs',
      'about',
      'contact',
    ]);
    assert.strictEqual(updateProfile.mock.calls.length, 1);
    assert.strictEqual(getResumeDetail.mock.calls.length, 1);
    assert.strictEqual(resumeSave.mock.calls.length, 2);
  });

  it('matches existing wanted awards by title instead of re-adding them', async () => {
    const resumeActivity = {
      add: mock.fn(async () => undefined),
      update: mock.fn(async () => undefined),
      delete: mock.fn(async () => undefined),
    };
    mock.method(SessionManager, 'getAPI', async () => ({
      updateProfile: mock.fn(async () => undefined),
      getResumeDetail: mock.fn(async () => ({
        activities: [
          { id: 'award-1', title: '우수상', activity_type: 'AWARD' },
          { id: 'project-1', title: 'Side project', activity_type: 'PROJECT' },
        ],
      })),
      resumeActivity,
    }));

    const result = await syncToWanted(
      { profile: { headline: 'h', description: 'd' } },
      { resume_id: 'resume-1', dry_run: false },
      { awards: [{ name: '우수상', organization: '한양사이버대학교', year: '2026' }] }
    );

    assert.ok(result.updated.includes('activities'));
    assert.strictEqual(resumeActivity.add.mock.calls.length, 0);
    assert.deepStrictEqual(
      resumeActivity.update.mock.calls.map((call) => call.arguments.slice(0, 2)),
      [['resume-1', 'award-1']]
    );
    assert.strictEqual(resumeActivity.delete.mock.calls.length, 0);
  });

  it('returns jobkorea dry-run plan in isolation', async () => {
    const result = await syncToJobKorea({ name: 'Test User', careers: [] }, { dry_run: true });
    assert.strictEqual(result.dry_run, true);
    assert.strictEqual(result.mode, 'api-only');
    assert.ok(Array.isArray(result.steps));
  });

  it('returns remember dry-run plan in isolation', async () => {
    const result = await syncToRemember({ name: 'Test User', careers: [] }, { dry_run: true });
    assert.strictEqual(result.dry_run, true);
    assert.strictEqual(result.method, 'browser_automation');
    assert.ok(Array.isArray(result.steps));
  });
});
