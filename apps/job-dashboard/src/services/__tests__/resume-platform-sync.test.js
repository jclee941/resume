import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { encrypt } from '@resume/shared/crypto';
import { syncResumePlatform } from '../resume-platform-sync/index.js';
import { syncJobKoreaFromSsot } from '../resume-platform-sync/jobkorea.js';
import { syncWantedFromSsot } from '../resume-platform-sync/wanted.js';
import {
  toJobKoreaBrowserCookies,
  withJobKoreaEditor,
} from '../resume-platform-sync/jobkorea-editor.js';

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

const LIVE_FORM = [
  { name: 'UnivSchool.Index', value: 'c3' },
  { name: 'UnivSchool[c3].Schl_Name', value: '한양사이버대학교' },
  { name: 'UnivSchool[c3].Grad_YM', value: '202802' },
  { name: 'UnivSchool[c3].Grad_Type_Code', value: '4' },
  { name: 'UnivSchool[c3].Grade', value: '4.0' },
  { name: 'Award.Index', value: 'c1' },
  { name: 'Award[c1].Award_Name', value: '자율주행 경진대회 우수상' },
];

function fakeEditor({
  fields = LIVE_FORM,
  tokens = { LastEditDateTicks: '638000' },
  saveText = '{"saveResult":{"IsSuccess":true}}',
} = {}) {
  const save = mock.fn(async () => ({ status: 200, text: saveText }));
  const withEditor = mock.fn(async (_env, _session, fn) => fn({ fields, tokens, save }));
  return { save, withEditor };
}

describe('Cloudflare-native JobKorea resume sync', () => {
  it('previews the education and award changes from the live editor form', async () => {
    const env = await envWithSessions({ jobkorea: 'ACNT=1; SES=2' }, { JOBKOREA_RNO: '777' });
    const { save, withEditor } = fakeEditor();

    const result = await syncJobKoreaFromSsot(env, SSOT, { dryRun: true, withEditor, now: 1000 });

    assert.equal(result.success, true);
    assert.equal(result.dryRun, true);
    assert.deepEqual(result.rows.Award, { live: ['c1'], saved: ['c1', '1_1000'] });
    assert.deepEqual(withEditor.mock.calls[0].arguments[1], {
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
    assert.deepEqual(changes['Award[1_1000].Award_Name'], [
      null,
      '자율주행 포뮬레이션 공모전 우수상',
    ]);
    assert.equal(save.mock.callCount(), 0);
  });

  it('saves the merged form from the editor page, keeping live fields and form tokens', async () => {
    const env = await envWithSessions({ jobkorea: 'ACNT=1' }, { JOBKOREA_RNO: '777' });
    const { save, withEditor } = fakeEditor();

    const result = await syncJobKoreaFromSsot(env, SSOT, { dryRun: false, withEditor });

    assert.equal(result.success, true);
    const body = new URLSearchParams(save.mock.calls[0].arguments[0]);
    assert.equal(body.get('UnivSchool[c3].Grad_Type_Code'), '5');
    assert.equal(body.get('UnivSchool[c3].Grad_YM'), '202702');
    assert.equal(body.get('UnivSchool[c3].Grade'), '4.0');
    assert.equal(body.get('LastEditDateTicks'), '638000');
  });

  it('refuses a save that would drop live fields from a replaced row', async () => {
    const env = await envWithSessions({ jobkorea: 'ACNT=1' }, { JOBKOREA_RNO: '777' });
    const liveCareer = Array.from({ length: 80 }, (_, i) => ({
      name: `Career[c14].Field${i}`,
      value: 'kept',
    }));
    const { save, withEditor } = fakeEditor({
      fields: [...LIVE_FORM, { name: 'Career.index', value: 'c14' }, ...liveCareer],
    });
    const ssot = {
      ...SSOT,
      careers: [{ company: 'Example', period: '2020.01 ~ 2021.01', role: 'Engineer' }],
    };

    const result = await syncJobKoreaFromSsot(env, ssot, { dryRun: false, withEditor, now: 1000 });

    assert.equal(result.success, false);
    assert.match(result.error, /would lose live fields in the save: Career\[c14\]/);
    assert.equal(save.mock.callCount(), 0);
  });

  it('reports the message JobKorea returns when it rejects the save', async () => {
    const env = await envWithSessions({ jobkorea: 'ACNT=1' }, { JOBKOREA_RNO: '777' });
    const { withEditor } = fakeEditor({
      saveText: '{"saveResult":{"IsSuccess":false,"ErrorMessage":"담당직무를 입력해주세요"}}',
    });

    const result = await syncJobKoreaFromSsot(env, SSOT, { dryRun: false, withEditor });

    assert.equal(result.success, false);
    assert.equal(result.error, '담당직무를 입력해주세요');
  });

  it('refuses to save when the editor form is empty', async () => {
    const env = await envWithSessions({ jobkorea: 'ACNT=1' }, { JOBKOREA_RNO: '777' });
    const { save, withEditor } = fakeEditor({ fields: [] });

    const result = await syncJobKoreaFromSsot(env, SSOT, { dryRun: false, withEditor });

    assert.equal(result.success, false);
    assert.match(result.error, /resume form was empty/);
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
});

function fakeEditorPage({
  formFound = true,
  alert,
  url = 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=42',
} = {}) {
  let onDialog = () => {};
  const page = {
    on: mock.fn((event, handler) => {
      if (event === 'dialog') onDialog = handler;
    }),
    setCookie: mock.fn(async () => {}),
    goto: mock.fn(async () => {
      if (alert) onDialog({ message: () => alert, dismiss: async () => {} });
    }),
    waitForSelector: mock.fn(async () => {
      if (!formFound) throw new Error('timeout');
    }),
    evaluate: mock.fn(async (_fn, first, second) =>
      Array.isArray(second)
        ? {
            fields: [{ name: 'UnivSchool.Index', value: 'c3' }],
            tokens: { LastEditDateTicks: '638000' },
          }
        : { status: 200, text: `saved ${first} ${second}` }
    ),
    url: () => url,
    title: async () => '로그인 | 잡코리아',
    close: mock.fn(async () => {}),
  };
  const withBrowserSession = mock.fn(async (_env, fn) => fn({ newPage: async () => page }));
  return { page, withBrowserSession };
}

describe('JobKorea editor over Browser Rendering', () => {
  it('opens the editor with jobkorea.co.kr cookies, reads the form, and saves from the page', async () => {
    const { page, withBrowserSession } = fakeEditorPage();

    const outcome = await withJobKoreaEditor(
      {},
      { cookieString: 'A=1; B=x=y', rNo: '42' },
      async (editor) => {
        assert.deepEqual(editor.fields, [{ name: 'UnivSchool.Index', value: 'c3' }]);
        assert.deepEqual(editor.tokens, { LastEditDateTicks: '638000' });
        return editor.save('a=1');
      },
      { withBrowserSession }
    );

    assert.deepEqual(outcome, { status: 200, text: 'saved /User/Resume/Save a=1' });
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

  it('flags an expired session from the JobKorea alert when the form never appears', async () => {
    const { page, withBrowserSession } = fakeEditorPage({
      formFound: false,
      alert: '세션이 만료 되었습니다.',
      url: 'https://www.jobkorea.co.kr/Login/Login_ToT.asp',
    });

    await assert.rejects(
      withJobKoreaEditor({}, { cookieString: 'A=1', rNo: '42' }, async () => 'unreachable', {
        withBrowserSession,
      }),
      (error) => {
        assert.equal(error.code, 'JOBKOREA_SESSION_EXPIRED');
        assert.match(error.message, /path=\/Login\/Login_ToT\.asp/);
        assert.match(error.message, /alert=세션이 만료 되었습니다\./);
        return true;
      }
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
    assert.equal(education.status, 'EXPECTED_GRADUATION');
    assert.equal(education.description, null);
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
