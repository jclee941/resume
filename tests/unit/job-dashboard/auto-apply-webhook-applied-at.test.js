describe('job-dashboard auto-apply webhook applied timestamp', () => {
  let AutoApplyWebhookHandler;
  let originalFetch;

  beforeAll(async () => {
    ({ AutoApplyWebhookHandler } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply-webhook-handler.js'));
  });

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('sets applied_at when a successful non-dry-run apply marks application applied', async () => {
    const db = createWebhookDb();
    const auth = { getCookies: jest.fn(async () => 'wanted-session=stub') };
    const handler = new AutoApplyWebhookHandler({ DB: db }, auth);
    global.fetch = jest.fn(async (url) => {
      if (url.includes('/resumes/v1/list')) {
        return Response.json({ data: [{ id: 123, is_default: true }] });
      }
      if (url.includes('/applications/v2')) {
        return new Response('{}', { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const response = await handler.triggerAutoApply(createRequest({ dryRun: false }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, applied: 1, failed: 0 });
    expect(db.updateApplication.query).toContain('applied_at');
    expect(db.updateApplication.params).toEqual([
      'applied',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      'app-1',
    ]);
    expect(db.timeline.params).toEqual([
      'app-1',
      'applied',
      'Auto-applied via Worker automation',
      db.updateApplication.params[1],
    ]);
  });
});

function createRequest(body) {
  return { json: async () => body };
}

function createWebhookDb() {
  const state = {};
  return {
    get updateApplication() {
      return state.updateApplication;
    },
    get timeline() {
      return state.timeline;
    },
    prepare(query) {
      if (query.includes('FROM applications') && query.includes("status = 'saved'")) {
        return makeStatement(() => ({
          all: async () => ({
            results: [
              {
                id: 'app-1',
                job_id: '42',
                position: 'Platform Engineer',
                company: 'Trace Co',
                match_score: 91,
                source_url: 'https://wanted.co.kr/wd/42',
              },
            ],
          }),
        }));
      }
      if (query.startsWith('UPDATE applications SET')) {
        return makeStatement((...params) => ({
          run: async () => {
            state.updateApplication = { query, params };
          },
        }));
      }
      if (query.startsWith('INSERT INTO application_timeline')) {
        return makeStatement((...params) => ({
          run: async () => {
            state.timeline = { query, params };
          },
        }));
      }
      throw new Error(`Unexpected query: ${query}`);
    },
  };
}

function makeStatement(handler) {
  return {
    bind: (...params) => handler(...params),
  };
}
