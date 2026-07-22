describe('Cloudflare Browser Rendering application submitter', () => {
  let createApplicationUrl;
  let submitWithBrowserRendering;

  beforeAll(async () => {
    ({ createApplicationUrl, submitWithBrowserRendering } =
      await import('../../../apps/job-dashboard/src/workflows/application/browser-rendering-submit.js'));
  });

  test('resolves platform application URLs from native job IDs', () => {
    expect(createApplicationUrl('jobkorea', 'jobkorea-49043911')).toBe(
      'https://www.jobkorea.co.kr/Recruit/GI_Read/49043911'
    );
    expect(createApplicationUrl('saramin', 'saramin-51234')).toBe(
      'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=51234'
    );
  });

  test('requires MYBROWSER before attempting a rendered submission', async () => {
    const result = await submitWithBrowserRendering(
      { env: {} },
      { platform: 'jobkorea', jobId: 'jobkorea-49043911' }
    );

    expect(result).toMatchObject({
      success: false,
      browserRendered: false,
      requiresBrowserRenderingBinding: true,
      targetUrl: 'https://www.jobkorea.co.kr/Recruit/GI_Read/49043911',
    });
  });

  test('rejects external sourceUrl before browser navigation or cookie hydration', async () => {
    const BrowserService = jest.fn(() => ({
      newPage: jest.fn(async () => {
        throw new Error('BrowserService must not be constructed for external URLs');
      }),
    }));
    const result = await submitWithBrowserRendering(
      { env: { MYBROWSER: {}, SESSIONS: { get: jest.fn(async () => 'User=abc') } } },
      {
        platform: 'jobkorea',
        sourceUrl: 'https://evil.example/Recruit/GI_Read/49043911',
      },
      { BrowserService }
    );

    expect(result).toMatchObject({
      success: false,
      browserRendered: false,
      targetUrl: null,
      networkWrite: false,
    });
    expect(BrowserService).not.toHaveBeenCalled();
  });

  test('hydrates platform cookies and auto-clicks apply and confirmation controls', async () => {
    const fakePage = new FakePage([
      pageState('채용 상세', [{ text: '즉시지원', selector: '#apply' }]),
      pageState('지원서 확인', [{ text: '입사지원', selector: '#confirm' }]),
      pageState('입사지원이 완료되었습니다', []),
    ]);
    const close = jest.fn(async () => {});
    const ctx = {
      env: {
        MYBROWSER: {},
        SESSIONS: { get: jest.fn(async () => 'User=abc; token=def') },
      },
    };

    const result = await submitWithBrowserRendering(
      ctx,
      { platform: 'jobkorea', jobId: 'jobkorea-49043911' },
      {
        BrowserService: class {
          async newPage() {
            return fakePage;
          }
          close = close;
        },
      }
    );

    expect(result).toMatchObject({
      success: true,
      status: 'submitted',
      browserRendered: true,
      networkWrite: true,
      cookieCount: 2,
    });
    expect(fakePage.gotoCalls).toEqual(['https://www.jobkorea.co.kr/Recruit/GI_Read/49043911']);
    expect(fakePage.clicks).toEqual(['#apply', '#confirm']);
    expect(fakePage.cookies).toHaveLength(2);
    expect(close).toHaveBeenCalled();
  });

  test('returns rendered review required when final completion is not confirmed', async () => {
    const fakePage = new FakePage([
      pageState('채용 상세', [{ text: '즉시지원', selector: '#apply' }]),
      pageState('추가 입력 필요', []),
    ]);

    const result = await submitWithBrowserRendering(
      { env: { MYBROWSER: {}, SESSIONS: { get: jest.fn(async () => '') } } },
      { platform: 'saramin', jobId: 'saramin-51234' },
      {
        BrowserService: class {
          async newPage() {
            return fakePage;
          }
        },
      }
    );

    expect(result).toMatchObject({
      success: false,
      status: 'rendered',
      browserRendered: true,
      requiresBrowserRendering: true,
      networkWrite: true,
    });
  });
});

function pageState(bodyText, controls) {
  return { bodyText, controls };
}

class FakePage {
  constructor(states) {
    this.states = states;
    this.index = 0;
    this.cookies = [];
    this.clicks = [];
    this.gotoCalls = [];
  }

  async setCookie(...cookies) {
    this.cookies.push(...cookies);
  }

  async goto(url) {
    this.gotoCalls.push(url);
    return { status: () => 200 };
  }

  async evaluate() {
    return this.states[this.index];
  }

  async $(selector) {
    return {
      click: async () => {
        this.clicks.push(selector);
        this.index = Math.min(this.index + 1, this.states.length - 1);
      },
    };
  }

  async title() {
    return 'Rendered application';
  }

  url() {
    return this.gotoCalls.at(-1);
  }

  async close() {}
}
