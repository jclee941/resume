import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyOnPostingPage, submitJobKoreaApplication } from '../jobkorea-submit.js';

const POSTING_URL = 'https://www.jobkorea.co.kr/Recruit/GI_Read/50369787';
const ONPASS_URL = 'https://www.jobkorea.co.kr/Recruit/OnPass?GI_No=50369787';

/**
 * A page whose evaluate runs the real in-page function against a minimal document.
 */
class FakePage {
  /** @param {{ url: string; title?: string; controls: string[]; body?: string }} state */
  constructor(state) {
    this.state = state;
    /** @type {string[]} */
    this.clicks = [];
    /** @type {(text: string) => void} */
    this.onClick = () => {};
  }
  url() {
    return this.state.url;
  }
  frames() {
    return [];
  }
  on() {}
  async evaluate(fn, arg) {
    const previous = globalThis.document;
    globalThis.document = {
      title: this.state.title ?? '',
      body: { innerText: this.state.body ?? '' },
      querySelectorAll: () =>
        this.state.controls.map((text) => ({
          innerText: text,
          getBoundingClientRect: () => ({ width: 10, height: 10 }),
          setAttribute: () => {},
        })),
    };
    try {
      return fn(arg);
    } finally {
      globalThis.document = previous;
    }
  }
  async click(selector) {
    const text = this.state.controls[Number(selector.match(/"(\d+)"/)?.[1])];
    this.clicks.push(text);
    this.onClick(text);
  }
}

/**
 * @param {{ postingControls: string[]; popupBody?: string; confirms?: boolean }} options
 */
function scenario({ postingControls, popupBody = '이력서 선택', confirms = true }) {
  const posting = new FakePage({ url: POSTING_URL, controls: postingControls });
  const popup = new FakePage({
    url: ONPASS_URL,
    title: '즉시지원 | 잡코리아',
    controls: ['취소', '지원하기'],
    body: popupBody,
  });
  let popupOpen = false;
  posting.onClick = (text) => {
    if (/즉시\s*지원/.test(text)) popupOpen = true;
  };
  popup.onClick = (text) => {
    if (text === '지원하기' && confirms) popup.state.body = '지원완료 되었습니다';
  };
  const browser = {
    targets: () => (popupOpen ? [{ url: () => ONPASS_URL, page: async () => popup }] : []),
  };
  return { posting, popup, browser };
}

const FAST = { timeoutMs: 50 };

test('preview stops at the OnPass popup without clicking 지원하기', async () => {
  const { posting, popup, browser } = scenario({ postingControls: ['스크랩', '즉시 지원'] });
  const result = await applyOnPostingPage(browser, posting, { preview: true, ...FAST });

  assert.equal(result.status, 'preview');
  assert.equal(result.onPassReached, true);
  assert.equal(result.popupTitle, '즉시지원 | 잡코리아');
  assert.equal(result.submitControl, true);
  assert.equal(result.success, false);
  assert.deepEqual(posting.clicks, ['즉시 지원']);
  assert.deepEqual(popup.clicks, []);
});

test('applies through 즉시지원 and 지원하기 and succeeds on 지원완료', async () => {
  const { posting, popup, browser } = scenario({ postingControls: ['즉시지원'] });
  const result = await applyOnPostingPage(browser, posting, FAST);

  assert.equal(result.success, true);
  assert.deepEqual(popup.clicks, ['지원하기']);
});

test('an unconfirmed submit is a failure, not an application', async () => {
  const { posting, browser } = scenario({ postingControls: ['즉시지원'], confirms: false });
  const result = await applyOnPostingPage(browser, posting, FAST);

  assert.equal(result.success, false);
  assert.match(String(result.error), /did not confirm/);
});

test('a posting without 즉시지원 is skipped and nothing is clicked', async () => {
  const { posting, browser } = scenario({ postingControls: ['홈페이지 지원', '스크랩'] });
  const result = await applyOnPostingPage(browser, posting, FAST);

  assert.equal(result.success, false);
  assert.equal(result.status, 'skipped');
  assert.deepEqual(posting.clicks, []);
});

test('a posting already applied to is reported as such', async () => {
  const { posting, browser } = scenario({ postingControls: ['지원완료'] });
  const result = await applyOnPostingPage(browser, posting, FAST);

  assert.equal(result.alreadyApplied, true);
  assert.deepEqual(posting.clicks, []);
});

test('a posting that asks for a company form is skipped before 지원하기', async () => {
  const { posting, popup, browser } = scenario({
    postingControls: ['즉시지원'],
    popupBody: '자사양식 다운로드 후 첨부해 주세요',
  });
  const result = await applyOnPostingPage(browser, posting, FAST);

  assert.equal(result.status, 'skipped');
  assert.deepEqual(popup.clicks, []);
});

test('logs in inside the applying browser and opens the posting with that login', async () => {
  const { posting, browser } = scenario({ postingControls: ['지원완료'] });
  /** @type {string[]} */
  const events = [];
  Object.assign(posting, {
    setRequestInterception: async () => {},
    setCookie: async (...cookies) => void events.push(`cookies:${cookies.length}`),
    goto: async (url) => void events.push(`goto:${url}`),
  });
  const contextBrowser = {
    ...browser,
    createBrowserContext: async () => ({
      newPage: async () => posting,
      close: async () => void events.push('context-closed'),
    }),
  };
  const result = await submitJobKoreaApplication({}, 'jobkorea-50369787', {
    withBrowserSession: async (_env, fn) => fn(contextBrowser),
    mint: async (_env, { withBrowserSession }) =>
      withBrowserSession(_env, async (used) => {
        assert.equal(used, contextBrowser);
        events.push('login');
        return 'JK_SID=1; JK_AUTH=2';
      }),
  });

  assert.equal(result.alreadyApplied, true);
  assert.deepEqual(events.slice(0, 3), ['login', 'cookies:2', `goto:${POSTING_URL}`]);
  assert.equal(events.at(-1), 'context-closed');
});
