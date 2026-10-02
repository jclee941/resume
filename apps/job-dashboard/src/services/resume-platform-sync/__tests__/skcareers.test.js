import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mapToSkCareersResume } from '@resume/shared/platform-sync/skcareers';
import { syncSkCareersFromSsot } from '../skcareers.js';

const env = { SKCAREERS_EMAIL: 'me@example.com', SKCAREERS_PASSWORD: 'secret' };
const ssot = {
  careers: [{ company: 'A', period: '2025.03 ~ 2026.02', role: 'SRE', description: 'ops' }],
};
const SESSION = 'SKRecruitProtal_SKLive=XZP-session';

function editorPage(fields) {
  const inputs = Object.entries(fields)
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${value}">`)
    .join('');
  return `<html><form id="form1" name="form1" method="post">${inputs}</form></html>`;
}

const EMPTY_EDITOR = editorPage({ prsPhone: '010', OriPhone: '010', resumeSeq: '0' });

function createSiteFetch({ editor = EMPTY_EDITOR, login = { success: true }, calls = [] } = {}) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const { pathname } = new URL(String(url));
    if (pathname === '/User/Login') {
      return new Response(JSON.stringify(login), {
        headers: [
          ['content-type', 'application/json'],
          ['set-cookie', `${SESSION}; path=/; secure; HttpOnly`],
        ],
      });
    }
    if (pathname === '/Mypage/ResumeCreate') {
      return typeof editor === 'string' ? new Response(editor) : editor;
    }
    if (pathname === '/Mypage/ResumeSave') return Response.json({ success: true });
    throw new Error(`unexpected request ${url}`);
  };
}

function decodeSavedForm(call) {
  const param = new URLSearchParams(call.init.body).get('p');
  const text = decodeURIComponent(atob(param.replaceAll('~univ~', '+')));
  return Object.fromEntries(text.split('&').map((pair) => pair.split('=')));
}

describe('syncSkCareersFromSsot', () => {
  it('logs in, then saves the editor form with the SSoT careers over it', async () => {
    const calls = [];

    const result = await syncSkCareersFromSsot(env, ssot, {
      dryRun: false,
      fetchImpl: createSiteFetch({ calls }),
    });

    assert.deepEqual(result, {
      platform: 'skcareers',
      success: true,
      dryRun: false,
      changes: { careers: 1 },
    });
    assert.deepEqual(
      calls.map((call) => new URL(call.url).pathname),
      ['/User/Login', '/Mypage/ResumeCreate', '/Mypage/ResumeSave']
    );
    assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0].init.body)), {
      email: 'me@example.com',
      password: 'secret',
      returnUrl: '/MyPage/Resume',
    });
    assert.equal(calls[1].init.headers.Cookie, SESSION);
    assert.equal(calls[2].init.headers.Cookie, SESSION);
    const saved = decodeSavedForm(calls[2]);
    assert.equal(saved.carCorpName, 'A');
    assert.equal(saved.carFromDate, '2025-03');
    assert.equal(saved.prsPhone, saved.OriPhone);
    assert.equal(saved.resumeSeq, '0');
  });

  it('reads but saves nothing on a dry run', async () => {
    const calls = [];

    const result = await syncSkCareersFromSsot(env, ssot, {
      dryRun: true,
      fetchImpl: createSiteFetch({ calls }),
    });

    assert.deepEqual(result.changes, { careers: 1 });
    assert.equal(result.dryRun, true);
    assert.equal(
      calls.some((call) => call.url.endsWith('/Mypage/ResumeSave')),
      false
    );
  });

  it('saves nothing when the saved resume already matches the SSoT', async () => {
    const calls = [];
    const { careers } = mapToSkCareersResume(ssot);
    const editor = editorPage({ prsPhone: '010', OriPhone: '010', ...careers, resumeSeq: '0' });

    const result = await syncSkCareersFromSsot(env, ssot, {
      dryRun: false,
      fetchImpl: createSiteFetch({ editor, calls }),
    });

    assert.deepEqual(result.changes, {});
    assert.equal(calls.length, 2);
  });

  it('reports the site message when the login fails', async () => {
    const calls = [];

    await assert.rejects(
      syncSkCareersFromSsot(env, ssot, {
        dryRun: true,
        fetchImpl: createSiteFetch({
          login: { success: false, msg: '<p>비밀번호를 확인해 주세요.</p>', gubun: '' },
          calls,
        }),
      }),
      /SK Careers login failed \(200\): 비밀번호를 확인해 주세요\./
    );
    assert.equal(calls.length, 1);
  });

  it('stops when the editor sends the session back to the login page', async () => {
    const redirect = new Response(null, {
      status: 302,
      headers: { location: 'http://www.skcareers.com/User/Login' },
    });

    await assert.rejects(
      syncSkCareersFromSsot(env, ssot, {
        dryRun: true,
        fetchImpl: createSiteFetch({ editor: redirect }),
      }),
      /resume editor answered 302/
    );
  });

  it('needs the account email and password', async () => {
    await assert.rejects(
      syncSkCareersFromSsot({}, ssot, { dryRun: true, fetchImpl: createSiteFetch() }),
      /SKCAREERS_EMAIL and SKCAREERS_PASSWORD are required/
    );
  });
});
