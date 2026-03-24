import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { D1Client, createD1Client } from '../index.js';

const require = createRequire(import.meta.url);
const https = require('node:https');
const originalHttpsRequest = https.request;
const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
}

function installHttpsMock(queue, calls) {
  https.request = (...args) => {
    const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
    const url = args[0];
    const options = callback ? args[1] : args[1] || {};
    const call = { url: String(url), options: options || {}, body: '' };
    calls.push(call);

    const req = new EventEmitter();
    req.write = (chunk) => {
      call.body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      return true;
    };
    req.end = (chunk) => {
      if (chunk) {
        req.write(chunk);
      }
      const next = queue.shift() || {
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ success: true, result: [{ results: [] }] }),
      };

      if (next.error) {
        process.nextTick(() => {
          req.emit('error', next.error);
        });
        return;
      }

      const res = new PassThrough();
      res.statusCode = next.statusCode ?? 200;
      res.statusMessage = next.statusMessage ?? 'OK';
      res.headers = next.headers || { 'content-type': 'application/json' };
      process.nextTick(() => {
        if (callback) {
          callback(res);
        }
        req.emit('response', res);
        res.end(next.body || '');
      });
    };
    req.setHeader = () => {};
    req.getHeader = () => undefined;
    req.removeHeader = () => {};
    req.flushHeaders = () => {};
    req.setTimeout = () => req;
    req.abort = () => {};
    req.destroy = () => {};
    return req;
  };
  syncBuiltinESMExports();
}

beforeEach(() => {
  mock.restoreAll();
  restoreEnv();
});

describe('D1Client', () => {
  it('constructor, createD1Client, and query handle env fallbacks and response branches', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account';
    process.env.D1_DATABASE_ID = 'env-db';
    process.env.CLOUDFLARE_API_KEY = 'env-key';

    const calls = [];
    const queue = [
      {
        body: JSON.stringify({ success: true, result: [{ results: [{ id: 1 }, { id: 2 }] }] }),
      },
      {
        body: JSON.stringify({ success: true, result: [] }),
      },
      {
        body: JSON.stringify({ success: false, errors: [{ message: 'explicit failure' }] }),
      },
      {
        body: JSON.stringify({ success: false, errors: [] }),
      },
    ];
    installHttpsMock(queue, calls);

    const explicit = new D1Client('a1', 'd1', 'k1');
    const fromEnv = new D1Client();
    const fromFactory = createD1Client();

    assert.equal(explicit.accountId, 'a1');
    assert.equal(explicit.databaseId, 'd1');
    assert.equal(explicit.apiKey, 'k1');
    assert.equal(fromEnv.accountId, 'env-account');
    assert.equal(fromEnv.databaseId, 'env-db');
    assert.equal(fromEnv.apiKey, 'env-key');
    assert.equal(fromFactory.accountId, 'env-account');
    assert.equal(fromFactory.databaseId, 'env-db');
    assert.equal(fromFactory.apiKey, 'env-key');

    const rows = await explicit.query('SELECT 1', ['x']);
    const emptyRows = await explicit.query('SELECT 2');

    await assert.rejects(explicit.query('SELECT 3'), /explicit failure/);
    await assert.rejects(explicit.query('SELECT 4'), /D1 query failed/);

    assert.deepEqual(rows, [{ id: 1 }, { id: 2 }]);
    assert.deepEqual(emptyRows, []);
    assert.equal(calls.length, 4);
    assert.equal(
      calls[0].url,
      'https://api.cloudflare.com/client/v4/accounts/a1/d1/database/d1/query'
    );
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers.authorization, 'Bearer k1');
    assert.equal(calls[0].options.headers['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(calls[0].body), { sql: 'SELECT 1', params: ['x'] });
    assert.deepEqual(JSON.parse(calls[1].body), { sql: 'SELECT 2', params: [] });
  });

  it('getApplications and getStats build expected queries across branch combinations', async () => {
    const client = new D1Client('acc', 'db', 'key');

    const getApplicationsSpy = mock.method(client, 'query', async () => []);
    await client.getApplications();
    await client.getApplications({ status: 'applied', platform: 'wanted', limit: 5, offset: 10 });

    assert.equal(getApplicationsSpy.mock.callCount(), 2);
    assert.equal(
      getApplicationsSpy.mock.calls[0].arguments[0],
      'SELECT * FROM job_applications WHERE 1=1 ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    assert.deepEqual(getApplicationsSpy.mock.calls[0].arguments[1], [100, 0]);
    assert.equal(
      getApplicationsSpy.mock.calls[1].arguments[0],
      'SELECT * FROM job_applications WHERE 1=1 AND status = ? AND platform = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    assert.deepEqual(getApplicationsSpy.mock.calls[1].arguments[1], ['applied', 'wanted', 5, 10]);

    mock.restoreAll();

    const statsClient = new D1Client('acc', 'db', 'key');
    const statsQueries = [];
    mock.method(statsClient, 'query', async (sql) => {
      statsQueries.push(sql);
      if (sql.includes('COUNT(*) as total')) {
        return [{ total: 11 }];
      }
      if (sql.includes('GROUP BY status')) {
        return [
          { status: 'saved', count: 7 },
          { status: 'applied', count: 4 },
        ];
      }
      return [
        { platform: 'wanted', count: 8 },
        { platform: 'jobkorea', count: 3 },
      ];
    });

    const stats = await statsClient.getStats();

    assert.deepEqual(stats, {
      total: 11,
      byStatus: { saved: 7, applied: 4 },
      byPlatform: { wanted: 8, jobkorea: 3 },
    });
    assert.equal(statsQueries.length, 3);

    mock.restoreAll();

    const emptyStatsClient = new D1Client('acc', 'db', 'key');
    mock.method(emptyStatsClient, 'query', async (sql) => {
      if (sql.includes('COUNT(*) as total')) {
        return [];
      }
      return [];
    });

    const emptyStats = await emptyStatsClient.getStats();
    assert.deepEqual(emptyStats, { total: 0, byStatus: {}, byPlatform: {} });
  });

  it('application and automation mutation methods return expected payloads and defaults', async () => {
    const client = new D1Client('acc', 'db', 'key');
    let now = 1700000000000;
    mock.method(Date, 'now', () => {
      now += 1;
      return now;
    });

    const calls = [];
    mock.method(client, 'query', async (sql, params) => {
      calls.push({ sql, params });
      return [];
    });

    const generated = await client.addApplication({
      platform: 'wanted',
      job_id: 'job-1',
      title: 'Backend',
      company: 'Acme',
      url: 'https://wanted.example/job-1',
      location: '',
      salary: '',
      deadline: '',
      status: '',
      match_score: 0,
      resume_id: '',
      notes: '',
    });
    const explicit = await client.addApplication({
      id: 'manual-id',
      platform: 'jobkorea',
      job_id: 'job-2',
      title: 'Platform',
      company: 'Beta',
      url: 'https://jobkorea.example/job-2',
      location: 'Seoul',
      salary: '100',
      deadline: '2026-01-01',
      status: 'applied',
      match_score: 90,
      resume_id: 'resume-1',
      notes: 'note',
    });

    const update = await client.updateStatus('manual-id', 'rejected');
    await client.getAutomationRuns();
    await client.getAutomationRuns(5);
    const runA = await client.createAutomationRun({ run_type: 'crawl', platform: 'wanted' });
    const runB = await client.createAutomationRun({
      run_type: 'apply',
      platform: 'jobkorea',
      config: { dryRun: true },
    });
    const completeA = await client.completeAutomationRun('run-x', {
      jobs_found: 10,
      jobs_matched: 6,
      jobs_applied: 2,
    });
    const completeB = await client.completeAutomationRun('run-y', {});

    assert.equal(generated.success, true);
    assert.match(generated.id, /^wanted_job-1_\d+$/);
    assert.deepEqual(explicit, { success: true, id: 'manual-id' });
    assert.deepEqual(update, { success: true });
    assert.match(runA.id, /^run_\d+$/);
    assert.match(runB.id, /^run_\d+$/);
    assert.deepEqual(completeA, { success: true });
    assert.deepEqual(completeB, { success: true });

    const addGeneratedParams = calls[0].params;
    assert.equal(addGeneratedParams[6], null);
    assert.equal(addGeneratedParams[7], null);
    assert.equal(addGeneratedParams[8], null);
    assert.equal(addGeneratedParams[9], 'saved');
    assert.equal(addGeneratedParams[10], 0);
    assert.equal(addGeneratedParams[11], null);
    assert.equal(addGeneratedParams[12], null);

    const addExplicitParams = calls[1].params;
    assert.equal(addExplicitParams[0], 'manual-id');
    assert.equal(addExplicitParams[6], 'Seoul');
    assert.equal(addExplicitParams[7], '100');
    assert.equal(addExplicitParams[8], '2026-01-01');
    assert.equal(addExplicitParams[9], 'applied');
    assert.equal(addExplicitParams[10], 90);
    assert.equal(addExplicitParams[11], 'resume-1');
    assert.equal(addExplicitParams[12], 'note');

    assert.deepEqual(calls[2].params, ['rejected', 'manual-id']);
    assert.deepEqual(calls[3].params, [20]);
    assert.deepEqual(calls[4].params, [5]);
    assert.deepEqual(calls[5].params.slice(1), ['crawl', 'wanted', '{}']);
    assert.deepEqual(calls[6].params.slice(1), ['apply', 'jobkorea', '{"dryRun":true}']);
    assert.deepEqual(calls[7].params, [
      '{"jobs_found":10,"jobs_matched":6,"jobs_applied":2}',
      10,
      6,
      2,
      'run-x',
    ]);
    assert.deepEqual(calls[8].params, ['{}', 0, 0, 0, 'run-y']);
  });

  it('duplicate checking and batch duplicate helpers cover exact, fuzzy, and unique flows', async () => {
    const duplicateClient = new D1Client('acc', 'db', 'key');
    const queryResponses = [
      [{ id: 'exact-1', job_id: 'job-1' }],
      [],
      [{ id: 'fuzzy-1', company: 'Acme', title: 'Backend' }],
      [],
      [],
    ];
    mock.method(duplicateClient, 'query', async () => queryResponses.shift() || []);

    const exact = await duplicateClient.checkDuplicate('wanted', 'job-1');
    const fuzzy = await duplicateClient.checkDuplicate('wanted', 'job-2', 'Acme', 'Backend');
    const notDuplicateWithFuzzyCheck = await duplicateClient.checkDuplicate(
      'wanted',
      'job-3',
      'Other',
      'Role'
    );
    const notDuplicateWithoutFuzzyCheck = await duplicateClient.checkDuplicate('wanted', 'job-4');

    assert.deepEqual(exact, {
      isDuplicate: true,
      existingApplication: { id: 'exact-1', job_id: 'job-1' },
      matchType: 'exact',
    });
    assert.deepEqual(fuzzy, {
      isDuplicate: true,
      existingApplication: { id: 'fuzzy-1', company: 'Acme', title: 'Backend' },
      matchType: 'fuzzy',
    });
    assert.deepEqual(notDuplicateWithFuzzyCheck, { isDuplicate: false });
    assert.deepEqual(notDuplicateWithoutFuzzyCheck, { isDuplicate: false });

    mock.restoreAll();

    const idsClient = new D1Client('acc', 'db', 'key');
    mock.method(idsClient, 'query', async () => [
      { job_id: 'a' },
      { job_id: 'b' },
      { job_id: 'a' },
    ]);

    const appliedIds = await idsClient.getAppliedJobIds('wanted');
    assert.deepEqual([...appliedIds].sort(), ['a', 'b']);

    const batchClient = new D1Client('acc', 'db', 'key');
    const getAppliedSpy = mock.method(
      batchClient,
      'getAppliedJobIds',
      async () => new Set(['x', 'z'])
    );

    const emptyBatch = await batchClient.batchCheckDuplicates('wanted', []);
    const mixedBatch = await batchClient.batchCheckDuplicates('wanted', ['x', 'y', 'z']);

    assert.deepEqual(emptyBatch, { duplicates: [], unique: [] });
    assert.deepEqual(mixedBatch, { duplicates: ['x', 'z'], unique: ['y'] });
    assert.equal(getAppliedSpy.mock.callCount(), 1);
    assert.deepEqual(getAppliedSpy.mock.calls[0].arguments, ['wanted']);
  });
});

process.on('exit', () => {
  https.request = originalHttpsRequest;
  syncBuiltinESMExports();
});
