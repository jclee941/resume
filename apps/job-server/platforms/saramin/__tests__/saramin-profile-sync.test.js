import test from 'node:test';
import assert from 'node:assert/strict';
import { SaraminProfileSync } from '../saramin-profile-sync.js';

function createResponse(status) {
  return {
    status: () => status,
  };
}

test('parseProfileSections extracts normalized fields from text snapshot', () => {
  const snapshot = {
    name: '홍길동',
    fullText: [
      '이름: 홍길동',
      '이메일: hong@example.com',
      '연락처 010-1234-5678',
      '1994.10.17',
      '남자',
      '학교명: 한양사이버대학교',
      '전공: 컴퓨터공학과',
      '졸업 상태: 재학중',
      '희망 직무: 보안 엔지니어',
      '희망 근무 지역: 경기',
      '희망 연봉: 5000만원',
      '(주)아이티센 CTS',
      'Python',
      'AWS',
      'CCNP',
    ].join('\n'),
  };

  const parsed = SaraminProfileSync.parseProfileSections(snapshot);

  assert.equal(parsed.personal.name, '홍길동');
  assert.equal(parsed.personal.email, 'hong@example.com');
  assert.equal(parsed.personal.phone, '010-1234-5678');
  assert.equal(parsed.personal.birthDate, '1994.10.17');
  assert.ok(parsed.skills.some((skill) => skill.name === 'Python'));
  assert.ok(parsed.certifications.some((cert) => cert.name.includes('CCNP')));
  assert.equal(parsed.desiredConditions.location, '경기');
});

test('navigateWithRetry retries on 5xx and succeeds', async () => {
  const sync = new SaraminProfileSync({ timeout: 1000 });
  const statuses = [503, 502, 200];
  let calls = 0;

  sync.page = {
    goto: async () => {
      calls += 1;
      return createResponse(statuses.shift());
    },
  };

  sync.baseCrawler.sleep = async () => {};
  sync.humanDelay = async () => {};

  const result = await sync.navigateWithRetry(
    'https://www.saramin.co.kr/zf_user/member/suited-recruit-person'
  );
  assert.equal(result.success, true);
  assert.equal(calls, 3);
});

test('getProfile returns CAPTCHA_REQUIRED when captcha detected', async () => {
  const sync = new SaraminProfileSync();
  sync.page = {};

  sync.navigateWithRetry = async () => ({ success: true, status: 200 });
  sync.detectAuthMaintenanceCaptcha = async () => ({
    success: false,
    code: 'CAPTCHA_REQUIRED',
    message: 'CAPTCHA challenge detected',
  });

  const result = await sync.getProfile();
  assert.equal(result.success, false);
  assert.equal(result.code, 'CAPTCHA_REQUIRED');
});

test('getProfile returns AUTH_REQUIRED when login state detected', async () => {
  const sync = new SaraminProfileSync();
  sync.page = {};

  sync.navigateWithRetry = async () => ({ success: true, status: 200 });
  sync.detectAuthMaintenanceCaptcha = async () => ({
    success: false,
    code: 'AUTH_REQUIRED',
    message: 'Saramin login required',
  });

  const result = await sync.getProfile();
  assert.equal(result.success, false);
  assert.equal(result.code, 'AUTH_REQUIRED');
});

test('getProfile returns NETWORK_RETRY_EXHAUSTED on navigation failures', async () => {
  const sync = new SaraminProfileSync();
  sync.page = {};

  sync.navigateWithRetry = async () => ({
    success: false,
    code: 'NETWORK_RETRY_EXHAUSTED',
    message: 'HTTP 503',
  });

  const result = await sync.getProfile();
  assert.equal(result.success, false);
  assert.equal(result.code, 'NETWORK_RETRY_EXHAUSTED');
});

test('getProfile returns normalized profile data on success', async () => {
  const sync = new SaraminProfileSync();
  sync.page = { waitForTimeout: async () => {} };

  sync.navigateWithRetry = async () => ({ success: true, status: 200 });

  let checkCount = 0;
  sync.detectAuthMaintenanceCaptcha = async () => {
    checkCount += 1;
    return { success: true };
  };

  sync.selectActiveResumeIfNeeded = async () => {};
  sync.humanDelay = async () => {};
  sync.randomMouseMovement = async () => {};
  sync.humanScroll = async () => {};

  sync.extractProfileSnapshot = async () => ({
    name: '홍길동',
    fullText: [
      '이름: 홍길동',
      '이메일: hong@example.com',
      '연락처 010-1234-5678',
      '(주)아이티센 CTS',
      'Python',
    ].join('\n'),
  });

  const result = await sync.getProfile();
  assert.equal(result.success, true);
  assert.equal(result.code, 'OK');
  assert.equal(result.data.personal.name, '홍길동');
  assert.ok(result.data.skills.some((skill) => skill.name === 'Python'));
  assert.equal(checkCount, 2);
});
