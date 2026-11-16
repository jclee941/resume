import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { handleInboundEmail, JOBKOREA_2FA_ADDRESS } from '../inbound-mail.js';
import { JOBKOREA_2FA_CODE_KEY } from '../../jobkorea/two-factor-code.js';

const NOW = Date.UTC(2026, 10, 16, 9, 0, 0);

function kv() {
  return { put: mock.fn(async () => {}), get: mock.fn(async () => null) };
}

function message({ raw, from = 'bounce@mailer.jobkorea.co.kr', to = JOBKOREA_2FA_ADDRESS }) {
  return { from, to, raw: new Response(raw.replace(/\n/g, '\r\n')).body, setReject: mock.fn() };
}

// Synthetic JobKorea-style mail: multipart/alternative, UTF-8 quoted-printable text, base64 HTML.
function jobkoreaMail({ code = '482913', dkim = true, from = 'noreply@jobkorea.co.kr' } = {}) {
  const html = Buffer.from(
    `<html><body><p>인증번호는 <b>${code}</b> 입니다.</p><p>1588-9350</p></body></html>`
  ).toString('base64');
  return [
    ...(dkim ? ['DKIM-Signature: v=1; a=rsa-sha256; d=jobkorea.co.kr; s=sel; b=abc'] : []),
    `From: =?UTF-8?B?${Buffer.from('잡코리아').toString('base64')}?= <${from}>`,
    'To: someone@example.com',
    `Subject: =?UTF-8?B?${Buffer.from('[잡코리아] 2단계 인증번호 안내').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="b1"',
    '',
    '--b1',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    `=EC=9D=B8=EC=A6=9D=EB=B2=88=ED=98=B8: ${code}`,
    '--b1',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    html,
    '--b1--',
    '',
  ].join('\n');
}

describe('handleInboundEmail', () => {
  it('stores the code from a DKIM-signed JobKorea mail with a 300 s TTL', async () => {
    const env = { SESSIONS: kv() };
    const msg = message({ raw: jobkoreaMail() });

    await handleInboundEmail(msg, env, { clock: () => NOW });

    assert.equal(env.SESSIONS.put.mock.callCount(), 1);
    const [key, value, options] = env.SESSIONS.put.mock.calls[0].arguments;
    assert.equal(key, JOBKOREA_2FA_CODE_KEY);
    assert.deepEqual(JSON.parse(value), { code: '482913', receivedAt: NOW });
    assert.deepEqual(options, { expirationTtl: 300 });
    assert.equal(msg.setReject.mock.callCount(), 0);
  });

  it('stores the code from JobKorea mail that Kakao Mail redirected', async () => {
    const env = { SESSIONS: kv() };
    const raw = jobkoreaMail({ code: '7351', dkim: false });

    await handleInboundEmail(message({ raw, from: 'srs0=ab=cd@daum.net' }), env, {
      clock: () => NOW,
    });

    assert.equal(JSON.parse(env.SESSIONS.put.mock.calls[0].arguments[1]).code, '7351');
  });

  it('drops a JobKorea-looking mail that is neither signed nor relayed by JobKorea or Kakao', async () => {
    const env = { SESSIONS: kv() };
    const notify = mock.fn(async () => {});
    const raw = jobkoreaMail({ dkim: false });

    await handleInboundEmail(message({ raw, from: 'attacker@example.net' }), env, { notify });

    assert.equal(env.SESSIONS.put.mock.callCount(), 0);
    assert.equal(notify.mock.callCount(), 0);
  });

  it('sends a Kakao forwarding-confirmation mail to Telegram without storing anything', async () => {
    const env = { SESSIONS: kv() };
    const notify = mock.fn(async () => {});
    const raw = [
      'From: Kakao Mail <noreply@kakaocorp.com>',
      `Subject: =?UTF-8?B?${Buffer.from('자동 전달 주소 확인').toString('base64')}?=`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      'Confirm forwarding: https://mail.kakao.com/confirm?t=abc and https://evil.example/x',
      '',
    ].join('\n');

    await handleInboundEmail(message({ raw, from: 'noreply@kakaocorp.com' }), env, { notify });

    assert.equal(env.SESSIONS.put.mock.callCount(), 0);
    assert.equal(notify.mock.callCount(), 1);
    const text = notify.mock.calls[0].arguments[1];
    assert.match(text, /Subject: 자동 전달 주소 확인/);
    assert.match(text, /Link: https:\/\/mail\.kakao\.com\/confirm\?t=abc/);
    assert.doesNotMatch(text, /evil\.example/);
  });

  it('rejects mail for any other recipient without reading it', async () => {
    const env = { SESSIONS: kv() };
    const msg = message({ raw: jobkoreaMail(), to: 'someone-else@jclee.me' });

    await handleInboundEmail(msg, env);

    assert.equal(msg.setReject.mock.callCount(), 1);
    assert.equal(env.SESSIONS.put.mock.callCount(), 0);
  });
});
