import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { SessionManager } from '../auth.js';
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

  it('returns jobkorea dry-run plan in isolation', async () => {
    const result = await syncToJobKorea({ name: 'Test User', careers: [] }, { dry_run: true });
    assert.strictEqual(result.dry_run, true);
    assert.strictEqual(result.method, 'browser_automation');
    assert.ok(Array.isArray(result.steps));
  });

  it('returns remember dry-run plan in isolation', async () => {
    const result = await syncToRemember({ name: 'Test User', careers: [] }, { dry_run: true });
    assert.strictEqual(result.dry_run, true);
    assert.strictEqual(result.method, 'browser_automation');
    assert.ok(Array.isArray(result.steps));
  });
});
