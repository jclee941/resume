import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyToWanted } from '../wanted-strategy.js';
import { applyToJobKorea } from '../jobkorea-strategy.js';
import { applyToSaramin } from '../saramin-strategy.js';
import { resetRetryState } from '../../../shared/utils/retry.js';

function createBaseContext({ platform, gotoFailures = 0, forceLogin = false }) {
  let gotoCalls = 0;
  const makeButton = () => ({
    click: async () => {},
  });

  const page = {
    goto: async () => {
      gotoCalls += 1;
      if (gotoCalls <= gotoFailures) {
        throw new Error('network timeout');
      }
    },
    title: async () => 'mock-title',
    $: async () => null,
    screenshot: async () => {},
  };

  const findByText = async (_tag, text, cssAlternative = null) => {
    if (text === '로그인') {
      return forceLogin ? makeButton() : null;
    }

    if (platform === 'wanted') {
      if (text === '지원하기' || text === '제출') return makeButton();
      return null;
    }

    if (platform === 'jobkorea') {
      if (text === '즉시 지원' || text === '지원하기') return makeButton();
      if (cssAlternative === '#btnApplyDirect') return makeButton();
      return null;
    }

    if (platform === 'saramin') {
      if (text === '입사지원' || text === '지원하기' || text === '확인') return makeButton();
      return null;
    }

    return null;
  };

  const findElementWithText = async (text) => {
    if (text.includes('captcha') || text.includes('로봇') || text.includes('자동입력방지')) {
      return null;
    }

    if (text.includes('잠시 후 다시 시도') || text.includes('too many requests')) {
      return null;
    }

    if (text.includes('오류') || text.includes('실패') || text.includes('지원할 수 없습니다')) {
      return null;
    }

    if (text.includes('이미 지원한')) {
      return null;
    }

    if (
      text.includes('지원이 완료') ||
      text.includes('지원 완료') ||
      text.includes('지원하였습니다') ||
      text.includes('지원이 완료되었습니다')
    ) {
      return {};
    }

    return null;
  };

  const appManager = {
    addApplication: () => ({ id: 'app-1' }),
    updateStatus: () => {},
  };

  return {
    ctx: {
      page,
      findByText,
      findElementWithText,
      appManager,
      logger: {
        info: () => {},
        error: () => {},
      },
    },
    getGotoCalls: () => gotoCalls,
  };
}

describe('auto-apply strategy retry behavior', () => {
  beforeEach(() => {
    resetRetryState();
  });

  it('retries wanted apply up to configured limit (3 retries)', async () => {
    const { ctx, getGotoCalls } = createBaseContext({
      platform: 'wanted',
      gotoFailures: 3,
    });

    const result = await applyToWanted.call(ctx, {
      sourceUrl: 'https://wanted.example/job/1',
      company: 'Wanted Corp',
      title: 'Platform Engineer',
    });

    assert.equal(result.success, true);
    assert.equal(getGotoCalls(), 4);
  });

  it('retries jobkorea apply up to configured limit (5 retries)', async () => {
    const { ctx, getGotoCalls } = createBaseContext({
      platform: 'jobkorea',
      gotoFailures: 5,
    });

    const result = await applyToJobKorea.call(ctx, {
      sourceUrl: 'https://jobkorea.example/job/1',
      company: 'JobKorea Corp',
      title: 'Platform Engineer',
    });

    assert.equal(result.success, true);
    assert.equal(getGotoCalls(), 6);
  });

  it('retries saramin apply up to configured limit (5 retries)', async () => {
    const { ctx, getGotoCalls } = createBaseContext({
      platform: 'saramin',
      gotoFailures: 5,
    });

    const result = await applyToSaramin.call(ctx, {
      sourceUrl: 'https://saramin.example/job/1',
      company: 'Saramin Corp',
      title: 'Platform Engineer',
    });

    assert.equal(result.success, true);
    assert.equal(getGotoCalls(), 6);
  });

  it('fails fast on auth failure without retries', async () => {
    const { ctx, getGotoCalls } = createBaseContext({
      platform: 'wanted',
      gotoFailures: 0,
      forceLogin: true,
    });

    const result = await applyToWanted.call(ctx, {
      sourceUrl: 'https://wanted.example/job/2',
      company: 'Wanted Corp',
      title: 'Security Engineer',
    });

    assert.equal(result.success, false);
    assert.match(result.error, /Not logged in/i);
    assert.equal(getGotoCalls(), 1);
  });
});
