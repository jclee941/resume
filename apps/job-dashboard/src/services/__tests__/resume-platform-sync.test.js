import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { encrypt } from '@resume/shared/crypto';
import { syncResumePlatform } from '../resume-platform-sync/index.js';
import { syncJobKoreaFromSsot } from '../resume-platform-sync/jobkorea.js';
import { syncWantedFromSsot } from '../resume-platform-sync/wanted.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');

const SSOT = {
  personal: { name: 'Tester', email: 'tester@example.com', phone: '010-1234-5678' },
  education: {
    school: '예시대학교',
    major: '예시학과',
    startDate: '2024.03',
    endDate: '2027.02',
    status: '졸업 예정',
    schoolType: '4년제',
  },
  awards: [
    { name: '2026 예시 공모전 장려상', organization: '예시대학교', year: '2026' },
    { name: '예시 대회 공모전 우수상', organization: '예시대학교', year: '2026' },
  ],
  careers: [],
  certifications: [],
};

async function envWithSessions(sessions, extra = {}) {
  const stored = {};
  for (const [platform, cookie] of Object.entries(sessions)) {
    stored[`auth:${platform}`] = await encrypt(cookie, { ENCRYPTION_KEY });
  }
  return {
    ENCRYPTION_KEY,
    SESSIONS: { get: async (key) => stored[key] ?? null },
    ...extra,
  };
}

const version = (digit) => `"rv1-${digit.repeat(64)}"`;
function fakeEditor(responses = []) {
  const content = {
    general: { title: 'original', certificateDescription: 'retain' },
    awards: [],
    certificates: [],
    languages: [],
    languageTests: [],
    trainings: [],
    educationSummary: { belowHighSchool: false },
    educations: [],
  };
  const save = mock.fn(async () => responses.shift() ?? { status: 200, etag: version('b') });
  const withEditor = mock.fn(async (_env, _session, run) =>
    run({ content, etag: version('a'), save })
  );
  return { save, withEditor, content };
}

describe('Cloudflare-native JobKorea resume sync', () => {
  const env = { JOBKOREA_RNO: '42' };
  const jobkoreaLogin = async () => 'A=1';
  it('previews changed fields but sends no saves or private values', async () => {
    const { save, withEditor } = fakeEditor();
    const result = await syncJobKoreaFromSsot(env, SSOT, {
      dryRun: true,
      jobkoreaLogin,
      withEditor,
    });
    assert.deepEqual(
      result.wouldSync.map((x) => x.section),
      ['abilities', 'education', 'title']
    );
    assert.deepEqual(result.saved, []);
    assert.equal(save.mock.callCount(), 0);
    assert.ok(!JSON.stringify(result).includes(SSOT.education.school));
    assert.match(result.photo, /unsupported/);
  });
  it('chains the response ETag and stops at the first conflict', async () => {
    const { save, withEditor } = fakeEditor([
      { status: 200, etag: version('b') },
      { status: 412, etag: null },
    ]);
    const result = await syncJobKoreaFromSsot(env, SSOT, {
      dryRun: false,
      jobkoreaLogin,
      withEditor,
    });
    assert.deepEqual(result.saved, ['abilities']);
    assert.equal(result.success, false);
    assert.equal(result.failedSection, 'education');
    assert.deepEqual(
      save.mock.calls.map(({ arguments: [section, , etag] }) => [section, etag]),
      [
        ['abilities', version('a')],
        ['education', version('b')],
      ]
    );
  });
  it('stops on a successful response without a new version', async () => {
    const { save, withEditor } = fakeEditor([{ status: 200, etag: null }]);
    const result = await syncJobKoreaFromSsot(env, SSOT, {
      dryRun: false,
      jobkoreaLogin,
      withEditor,
    });
    assert.equal(result.success, false);
    assert.deepEqual(result.saved, ['abilities']);
    assert.equal(save.mock.callCount(), 1);
  });
  it('never saves an unchanged section', async () => {
    const { save, withEditor, content } = fakeEditor();
    const result = await syncJobKoreaFromSsot(
      env,
      { platformVariants: { jobkorea: { headline: content.general.title } } },
      { dryRun: false, jobkoreaLogin, withEditor }
    );
    assert.equal(result.success, true);
    assert.deepEqual(result.wouldSync, []);
    assert.equal(save.mock.callCount(), 0);
  });
  it('reports a missing KV session as expired, or a missing resume number, without opening the editor', async () => {
    const { withEditor } = fakeEditor();
    const noSession = await syncJobKoreaFromSsot(
      await envWithSessions({}, { JOBKOREA_RNO: '1' }),
      SSOT,
      { dryRun: true, withEditor }
    );
    const noRno = await syncJobKoreaFromSsot(await envWithSessions({ jobkorea: 'A=1' }), SSOT, {
      dryRun: true,
      withEditor,
    });

    assert.match(noSession.error, /auth:jobkorea/);
    assert.equal(noSession.code, 'JOBKOREA_SESSION_EXPIRED');
    assert.match(noRno.error, /JOBKOREA_RNO/);
    assert.equal(withEditor.mock.callCount(), 0);
  });

  it('hands the editor a login instead of reading the KV session when one is given', async () => {
    const env = await envWithSessions({}, { JOBKOREA_RNO: '777' });
    const { withEditor } = fakeEditor();
    const jobkoreaLogin = async () => 'L=1';

    const result = await syncJobKoreaFromSsot(env, SSOT, {
      dryRun: true,
      withEditor,
      jobkoreaLogin,
    });

    assert.equal(result.success, true);
    assert.deepEqual(withEditor.mock.calls[0].arguments[1], { login: jobkoreaLogin, rNo: '777' });
  });
});

function fakeWantedApi(detail) {
  const sub = () => ({
    add: mock.fn(async () => ({})),
    update: mock.fn(async () => ({})),
    delete: mock.fn(async () => ({})),
  });
  return {
    getResumeDetail: mock.fn(async () => detail),
    updateProfile: mock.fn(async () => ({})),
    resumeCareer: {
      ...sub(),
      addProject: mock.fn(async () => ({})),
      deleteProject: mock.fn(async () => ({})),
    },
    resumeEducation: sub(),
    resumeSkills: sub(),
    resumeActivity: sub(),
    resumeLanguageCert: sub(),
    resume: { save: mock.fn(async () => ({})) },
  };
}

describe('Cloudflare-native Wanted resume sync', () => {
  const detail = {
    careers: [],
    educations: [{ id: 9, school_name: '예시대학교' }],
    skills: [],
    activities: [{ id: 5, title: '예시 대회 공모전 우수상', activity_type: 'AWARD' }],
    language_certs: [],
    about: '',
  };

  it('updates the education and adds only the missing award', async () => {
    const env = await envWithSessions({ wanted: 'WWW_ONEID_ACCESS_TOKEN=t' });
    const api = fakeWantedApi(detail);

    const result = await syncWantedFromSsot(env, SSOT, {
      dryRun: false,
      targetResumeId: 'W-1',
      createApi: () => api,
    });

    assert.equal(api.getResumeDetail.mock.calls[0].arguments[0], 'W-1');
    const [, educationId, education] = api.resumeEducation.update.mock.calls[0].arguments;
    assert.equal(educationId, 9);
    assert.equal(education.end_time, '2027-02-01');
    assert.equal(education.status, 'EXPECTED_GRADUATION');
    assert.equal(education.description, null);
    const addedTitles = api.resumeActivity.add.mock.calls.map((call) => call.arguments[1].title);
    assert.deepEqual(addedTitles, ['2026 예시 공모전 장려상']);
    assert.ok(result.updated.includes('activities'));
  });

  it('reads the live resume on a dry run and never writes', async () => {
    const env = await envWithSessions({ wanted: 'WWW_ONEID_ACCESS_TOKEN=t' });
    const api = fakeWantedApi(detail);

    const result = await syncWantedFromSsot(env, SSOT, {
      dryRun: true,
      targetResumeId: 'W-1',
      createApi: () => api,
    });

    assert.equal(result.success, true);
    assert.deepEqual(
      result.wouldSync.awards,
      SSOT.awards.map((award) => award.name)
    );
    assert.equal(api.resumeEducation.update.mock.callCount(), 0);
    assert.equal(api.resumeActivity.add.mock.callCount(), 0);
  });

  it('requires a stored Wanted target resume', async () => {
    const env = await envWithSessions({ wanted: 'WWW_ONEID_ACCESS_TOKEN=t' });
    const result = await syncWantedFromSsot(env, SSOT, { dryRun: true, targetResumeId: null });
    assert.match(result.error, /target resume ID/);
  });
});

describe('syncResumePlatform', () => {
  it('reports Saramin as unsupported rather than syncing through local files', async () => {
    const result = await syncResumePlatform({}, 'saramin', SSOT, { dryRun: true });
    assert.equal(result.success, false);
    assert.match(result.error, /Saramin/);
  });
});
