import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { encrypt } from '@resume/shared/crypto';
import { syncResumePlatform } from '../resume-platform-sync/index.js';
import { syncJobKoreaFromSsot } from '../resume-platform-sync/jobkorea.js';
import { syncWantedFromSsot } from '../resume-platform-sync/wanted.js';
import {
  readJobKoreaFormViaBrowser,
  toJobKoreaBrowserCookies,
} from '../resume-platform-sync/jobkorea-form-reader.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');

const SSOT = {
  personal: { name: 'Tester', email: 'tester@example.com', phone: '010-1234-5678' },
  education: {
    school: '한양사이버대학교',
    major: '컴퓨터공학과',
    startDate: '2024.03',
    endDate: '2027.02',
    status: '졸업 예정',
    schoolType: '4년제',
  },
  awards: [
    { name: '2026 HYCU AI학습법 공모전 장려상', organization: '한양사이버대학교', year: '2026' },
    { name: '자율주행 포뮬레이션 공모전 우수상', organization: '한양사이버대학교', year: '2026' },
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

function fakeJobKoreaClient() {
  return {
    fetchEditPageTokens: mock.fn(async () => ({
      IsEditPage: 'True',
      IsCompleteSave: 'True',
      LastEditDateTicks: '638000',
    })),
    fetchEditPageBaseFields: mock.fn(async () => [
      { name: 'UnivSchool.Index', value: 'c3' },
      { name: 'UnivSchool[c3].Schl_Name', value: '한양사이버대학교' },
      { name: 'UnivSchool[c3].Grad_YM', value: '202802' },
      { name: 'UnivSchool[c3].Grad_Type_Code', value: '4' },
      { name: 'Award.Index', value: 'c1' },
      { name: 'Award[c1].Award_Name', value: '자율주행 경진대회 우수상' },
    ]),
    saveResume: mock.fn(async () => ({ success: true, result: {}, rawResponse: '{}' })),
  };
}

describe('Cloudflare-native JobKorea resume sync', () => {
  it('previews the education and award changes without saving on a dry run', async () => {
    const env = await envWithSessions({ jobkorea: 'ACNT=1; SES=2' }, { JOBKOREA_RNO: '777' });
    const client = fakeJobKoreaClient();
    const createClient = mock.fn(() => client);
    const readBrowserForm = mock.fn(async () => []);

    const result = await syncJobKoreaFromSsot(env, SSOT, {
      dryRun: true,
      createClient,
      readBrowserForm,
    });

    assert.equal(result.success, true);
    assert.equal(result.dryRun, true);
    assert.deepEqual(createClient.mock.calls[0].arguments[0].rNo, '777');
    assert.deepEqual(readBrowserForm.mock.calls[0].arguments[1], {
      cookieString: 'ACNT=1; SES=2',
      rNo: '777',
    });
    const changes = Object.fromEntries(result.changes.map((c) => [c.name, [c.before, c.after]]));
    assert.deepEqual(changes['UnivSchool[c3].Grad_Type_Code'], ['4', '5']);
    assert.deepEqual(changes['UnivSchool[c3].Grad_YM'], ['202802', '202702']);
    assert.deepEqual(changes['Award[c1].Award_Name'], [
      '자율주행 경진대회 우수상',
      '2026 HYCU AI학습법 공모전 장려상',
    ]);
    assert.deepEqual(changes['Award[c2].Award_Name'], [null, '자율주행 포뮬레이션 공모전 우수상']);
    assert.equal(client.saveResume.mock.callCount(), 0);
  });

  it('saves the merged form with the live base fields when applying', async () => {
    const env = await envWithSessions({ jobkorea: 'ACNT=1' }, { JOBKOREA_RNO: '777' });
    const client = fakeJobKoreaClient();

    const result = await syncJobKoreaFromSsot(env, SSOT, {
      dryRun: false,
      createClient: () => client,
      readBrowserForm: async () => [{ name: 'UnivSchool[c3].Grade', value: '4.0' }],
    });

    assert.equal(result.success, true);
    assert.equal(client.saveResume.mock.callCount(), 1);
    const [targetFields, saveOptions] = client.saveResume.mock.calls[0].arguments;
    assert.ok(
      targetFields.some((f) => f.name === 'UnivSchool[c3].Grad_Type_Code' && f.value === '5')
    );
    assert.equal(saveOptions.tokens.LastEditDateTicks, '638000');
    assert.ok(saveOptions.baseFields.some((f) => f.name === 'UnivSchool[c3].Grade'));
  });

  it('reports a missing KV session or resume number instead of calling JobKorea', async () => {
    const createClient = mock.fn(fakeJobKoreaClient);
    const noSession = await syncJobKoreaFromSsot(
      await envWithSessions({}, { JOBKOREA_RNO: '1' }),
      SSOT,
      {
        dryRun: true,
        createClient,
      }
    );
    const noRno = await syncJobKoreaFromSsot(await envWithSessions({ jobkorea: 'A=1' }), SSOT, {
      dryRun: true,
      createClient,
    });

    assert.match(noSession.error, /auth:jobkorea/);
    assert.match(noRno.error, /JOBKOREA_RNO/);
    assert.equal(createClient.mock.callCount(), 0);
  });
});

describe('Cloudflare-native JobKorea form reader', () => {
  it('scopes cookies to jobkorea.co.kr and serializes the resume form', async () => {
    const page = {
      setCookie: mock.fn(async () => {}),
      goto: mock.fn(async () => {}),
      waitForSelector: mock.fn(async () => {}),
      evaluate: mock.fn(async () => [{ name: 'UnivSchool.Index', value: 'c3' }]),
      close: mock.fn(async () => {}),
    };
    const withBrowserSession = mock.fn(async (_env, fn) => fn({ newPage: async () => page }));

    const fields = await readJobKoreaFormViaBrowser(
      {},
      { cookieString: 'A=1; B=x=y', rNo: '42' },
      { withBrowserSession }
    );

    assert.deepEqual(fields, [{ name: 'UnivSchool.Index', value: 'c3' }]);
    assert.deepEqual(
      page.setCookie.mock.calls[0].arguments,
      toJobKoreaBrowserCookies('A=1; B=x=y')
    );
    assert.equal(toJobKoreaBrowserCookies('A=1; B=x=y')[1].value, 'x=y');
    assert.equal(
      page.goto.mock.calls[0].arguments[0],
      'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=42'
    );
    assert.equal(page.close.mock.callCount(), 1);
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
    educations: [{ id: 9, school_name: '한양사이버대학교' }],
    skills: [],
    activities: [{ id: 5, title: '자율주행 포뮬레이션 공모전 우수상', activity_type: 'AWARD' }],
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
    assert.equal(education.description, '졸업예정 (2027.02)');
    const addedTitles = api.resumeActivity.add.mock.calls.map((call) => call.arguments[1].title);
    assert.deepEqual(addedTitles, ['2026 HYCU AI학습법 공모전 장려상']);
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
