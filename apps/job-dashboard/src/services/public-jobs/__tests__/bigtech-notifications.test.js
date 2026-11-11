import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSqliteD1 } from '../../application-history/__tests__/history-test-kit.js';
import { collectPublicJobs } from '../collect.js';

const job = {
  id_icims: '10595030',
  title: 'Network Development Engineer',
  company_name: 'Amazon Web Services Korea',
  location: 'KR, Seoul',
  country_code: 'KOR',
  job_path: '/en/jobs/10595030/network-development-engineer',
  description: '<p>Network infrastructure operations.</p><p>연봉: 8,000만원</p>',
  basic_qualifications: 'Network operations experience',
  preferred_qualifications: 'Firewall and routing',
};
const clock = () => new Date('2026-11-11T04:00:00Z');

describe('big-tech posting notifications', () => {
  it('collects a Korea posting with its disclosed salary and skips a delivered card on re-collection', async () => {
    const db = createSqliteD1();
    const messages = [];
    const env = {
      JOB_DB: db,
      NOTIFICATION_QUEUE: { send: async (message) => void messages.push(message) },
    };
    const options = {
      sources: ['amazon'],
      clock,
      fetcher: async () => Response.json({ hits: 1, jobs: [job] }),
    };
    const first = await collectPublicJobs(env, options);
    assert.equal(first.status, 'success');
    assert.deepEqual(first.sources.amazon, { listed: 1, candidates: 1, failed: 0, saved: 1 });
    assert.deepEqual(first.notifications, { queued: 1, failed: 0 });
    assert.equal(messages.length, 1);
    assert.equal(messages[0].id, 'public-job:amazon-10595030');
    assert.match(messages[0].payload.text, /연봉: 8,000만원/);
    const stored = db.sqlite.prepare('SELECT source, description FROM job_search_results').get();
    assert.equal(stored.source, 'amazon');
    assert.match(stored.description, /연봉: 8,000만원/);

    db.sqlite
      .prepare(
        `INSERT INTO notification_history (id, event_type, data, channels, timestamp, status)
       VALUES (?, 'public_job', '{}', '["telegram"]', 'now', 'success')`
      )
      .run(messages[0].id);
    const repeated = await collectPublicJobs(env, options);
    assert.deepEqual(repeated.notifications, { queued: 0, failed: 0 });
    assert.equal(messages.length, 1);
    assert.equal(
      db.sqlite.prepare('SELECT COUNT(*) AS count FROM job_search_results').get().count,
      1
    );
  });

  it('queues remaining sources when a company career site fails', async () => {
    const messages = [];
    const summary = await collectPublicJobs(
      {
        JOB_DB: createSqliteD1(),
        NOTIFICATION_QUEUE: { send: async (message) => void messages.push(message) },
      },
      {
        sources: ['kakao', 'amazon'],
        clock,
        fetcher: async (url) =>
          url.includes('kakao.com')
            ? new Response('unavailable', { status: 503 })
            : Response.json({ hits: 1, jobs: [job] }),
      }
    );
    assert.equal(summary.status, 'partial');
    assert.match(summary.sources.kakao.error, /503/);
    assert.equal(summary.sources.amazon.saved, 1);
    assert.deepEqual(summary.notifications, { queued: 1, failed: 0 });
    assert.equal(messages.length, 1);
  });
});
