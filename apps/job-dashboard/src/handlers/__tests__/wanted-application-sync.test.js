import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { ApplicationsHandler } from '../applications/index.js';

function createRequest({ body, url = 'http://localhost/api/applications/sync/wanted' } = {}) {
  return {
    url,
    async json() {
      if (body === undefined) {
        throw new Error('empty body');
      }
      return body;
    },
    async text() {
      if (body === undefined) {
        return '';
      }
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
  };
}

function createHandler({ auth, fetcher } = {}) {
  const handler = new ApplicationsHandler({ prepare: () => assert.fail('DB should not be used') }, auth, {
    fetcher,
  });
  const wantedRows = [];
  const dashboardRows = [];

  handler.wantedHistoryRepository = {
    upsertHistory: mock.fn(async (record) => {
      wantedRows.push(record);
      return record;
    }),
    upsertApplication: mock.fn(async (record) => {
      dashboardRows.push(record);
      return record;
    }),
  };

  return { dashboardRows, handler, wantedRows };
}

describe('ApplicationsHandler — Wanted application sync', () => {
  it('upserts supplied Wanted application history into history and dashboard tables', async () => {
    const { dashboardRows, handler, wantedRows } = createHandler();
    const request = createRequest({
      body: {
        applications: [
          {
            id: 91,
            status: 'accepted',
            applied_at: '2026-06-11T01:02:03.000Z',
            resume_id: 7,
            job: {
              id: 262001,
              position: 'Security Analyst Engineer',
              company: { name: 'MOIN' },
            },
          },
        ],
      },
    });

    const response = await handler.syncWantedHistory(request);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.imported, 1);
    assert.equal(data.source, 'request');
    assert.equal(wantedRows[0].wantedApplicationId, '91');
    assert.equal(wantedRows[0].status, 'offer');
    assert.equal(wantedRows[0].sourceUrl, 'https://www.wanted.co.kr/wd/262001');
    assert.equal(dashboardRows[0].id, 'wanted_91');
    assert.equal(dashboardRows[0].status, 'offer');
  });

  it('fetches Wanted application history when the request body is empty', async () => {
    const fetcher = mock.fn(async (url, options) => {
      assert.equal(url, 'https://www.wanted.co.kr/api/v4/applications?limit=50&offset=0');
      assert.equal(options.headers.Cookie, 'sid=abc');
      return Response.json({
        data: [
          {
            application_id: 'app-77',
            status: 'submitted',
            created_at: '2026-06-10T00:00:00.000Z',
            job_id: '348079',
            position: 'SRE Engineer',
            company_name: 'Vroong',
          },
        ],
      });
    });
    const auth = { getCookies: mock.fn(async () => 'sid=abc') };
    const { handler, wantedRows } = createHandler({ auth, fetcher });

    const response = await handler.syncWantedHistory(
      createRequest({ url: 'http://localhost/api/applications/sync/wanted?limit=50' })
    );
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.imported, 1);
    assert.equal(data.source, 'wanted-api');
    assert.equal(wantedRows[0].wantedJobId, '348079');
  });

  it('treats an explicit empty application array as a request payload', async () => {
    const fetcher = mock.fn(async () => assert.fail('Wanted API should not be fetched'));
    const { handler } = createHandler({ fetcher });

    const response = await handler.syncWantedHistory(createRequest({ body: { applications: [] } }));
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.imported, 0);
    assert.equal(data.source, 'request');
  });

  it('returns 401 when fetching Wanted history without a stored Wanted session', async () => {
    const auth = { getCookies: mock.fn(async () => null) };
    const { handler } = createHandler({ auth });

    const response = await handler.syncWantedHistory(createRequest());
    const data = await response.json();

    assert.equal(response.status, 401);
    assert.equal(data.error, 'Wanted session not found');
  });

  it('returns 400 when a Wanted history item has no application id', async () => {
    const { handler } = createHandler();
    const response = await handler.syncWantedHistory(
      createRequest({
        body: {
          applications: [{ status: 'submitted', job_id: '262001' }],
        },
      })
    );
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, 'Invalid Wanted application history item');
  });

  it('returns 400 for malformed JSON payloads', async () => {
    const { handler } = createHandler();

    const response = await handler.syncWantedHistory(createRequest({ body: '{"applications":' }));
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, 'Invalid JSON');
  });
});
