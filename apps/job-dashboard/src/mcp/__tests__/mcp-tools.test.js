import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TOKEN, makeDb, makeWorkflow, mcpClient } from './mcp-test-kit.js';

const MASTER = {
  id: 'master',
  target_resume_id: null,
  source: 'ssot',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
  data: JSON.stringify({
    personal: { name: 'Jane Roe', email: 'jane@example.com' },
    careers: [{}, {}],
    skills: { languages: ['js'] },
  }),
};

function setup({ route = () => null, extraEnv = {} } = {}) {
  const { db, statements } = makeDb(route);
  const workflow = makeWorkflow();
  const env = {
    ADMIN_TOKEN,
    JOB_DB: db,
    RESUME_SYNC_WORKFLOW: workflow.binding,
    JOB_CRAWLING_WORKFLOW: workflow.binding,
    APPLICATION_WORKFLOW: workflow.binding,
    ...extraEnv,
  };
  return { statements, workflow, ...mcpClient(env) };
}

test('get_master_resume summary returns section names and counts, never personal values', async () => {
  const { callTool } = setup({ route: (sql) => (/FROM resumes/.test(sql) ? MASTER : null) });
  const { body } = await callTool('get_master_resume');
  const result = body.result;
  assert.notEqual(result.isError, true);
  assert.deepEqual(result.structuredContent.sections, {
    personal: { type: 'object', keys: 2 },
    careers: { type: 'array', count: 2 },
    skills: { type: 'object', keys: 1 },
  });
  assert.doesNotMatch(result.content[0].text, /Jane Roe|jane@example\.com/);
  const full = (await callTool('get_master_resume', { mode: 'full' })).body.result;
  assert.equal(full.structuredContent.resume.personal.name, 'Jane Roe');
});

test('get_stats combines the overall and weekly handlers', async () => {
  const { callTool } = setup({
    route: (_sql, _a, mode) => (mode === 'first' ? { count: 3 } : mode === 'all' ? [] : null),
  });
  const { body } = await callTool('get_stats');
  assert.equal(body.result.structuredContent.overall.totalApplications, 3);
  assert.equal(body.result.structuredContent.weekly.total, 0);
});

test('get_workflow_instance reads the Workflow binding', async () => {
  const { callTool } = setup();
  const { body } = await callTool('get_workflow_instance', {
    workflowType: 'application',
    instanceId: 'wf-9',
  });
  assert.deepEqual(body.result.structuredContent, {
    instanceId: 'wf-9',
    status: 'running',
    output: null,
  });
  const unknown = await callTool('get_workflow_instance', {
    workflowType: 'nope',
    instanceId: 'x',
  });
  assert.equal(unknown.body.result.isError, true);
});

test('start_resume_sync and start_job_crawl default to dryRun true', async () => {
  const { callTool, workflow } = setup();
  const sync = await callTool('start_resume_sync');
  assert.equal(sync.body.result.structuredContent.instanceId, 'wf-1');
  await callTool('start_job_crawl', { keywords: ['platform'] });
  await callTool('start_resume_sync', { dryRun: false, platforms: ['wanted'] });
  assert.deepEqual(workflow.created, [
    { dryRun: true },
    { dryRun: true, searchCriteria: { keywords: ['platform'] } },
    { dryRun: false, platforms: ['wanted'] },
  ]);
});

test('run_auto_apply cannot really submit without the approval gate', async () => {
  const { callTool, statements } = setup({
    route: (sql, _a, mode) => {
      if (/FROM config/i.test(sql))
        return mode === 'all' ? [{ key: 'auto_apply_enabled', value: 'true' }] : null;
      return null;
    },
  });
  const { body } = await callTool('run_auto_apply', { dryRun: false });
  assert.equal(body.result.isError, true);
  assert.match(JSON.stringify(body.result.structuredContent), /approval|disabled/i);
  assert.equal(
    statements.some(({ sql }) => /INSERT INTO applications/i.test(sql)),
    false
  );
  const candidate = await callTool('run_auto_apply', {
    dryRun: false,
    explicitSubmit: true,
    submitOptIn: true,
    approvalId: 'a-1',
    candidates: [
      { id: '1', source: 'wanted', position: 'Eng', company: 'Acme', approvalId: 'other' },
    ],
  });
  assert.equal(candidate.body.result.isError, true);
});

test('approve and reject decide pending approvals; none pending is an error result', async () => {
  const pending = setup({
    route: (_s, _a, mode) => (mode === 'run' ? { meta: { changes: 2 } } : null),
  });
  const approved = await pending.callTool('approve_application', { instanceId: 'wf-1' });
  assert.deepEqual(approved.body.result.structuredContent, {
    success: true,
    approved: true,
    updated: 2,
  });
  const none = setup({
    route: (_s, _a, mode) => (mode === 'run' ? { meta: { changes: 0 } } : null),
  });
  const rejected = await none.callTool('reject_application', { instanceId: 'wf-1' });
  assert.equal(rejected.body.result.isError, true);
});

test('update_application_status validates the status enum', async () => {
  const { callTool } = setup({
    route: (sql, _a, mode) =>
      mode === 'first' && /FROM applications/.test(sql) ? { id: 'app-1', status: 'pending' } : null,
  });
  const bad = await callTool('update_application_status', { id: 'app-1', status: 'not-a-status' });
  assert.equal(bad.body.result.isError, true);
  const ok = await callTool('update_application_status', { id: 'app-1', status: 'applied' });
  assert.notEqual(ok.body.result.isError, true);
  assert.equal(ok.body.result.structuredContent.success, true);
});

test('content file tools report a missing table as an isError result', async () => {
  const { callTool } = setup({
    route: () => {
      throw new Error('D1_ERROR: no such table: content_files');
    },
  });
  for (const [name, args] of [
    ['list_content_files', {}],
    ['get_content_file', { path: 'a.md' }],
  ]) {
    const { body } = await callTool(name, args);
    assert.equal(body.result.isError, true, name);
    assert.match(
      body.result.structuredContent.details.error,
      /content_files table is not available/
    );
  }
});

test('content files: text as utf-8, binary as base64, over 1 MiB refused', async () => {
  const rows = {
    'notes/a.md': {
      path: 'notes/a.md',
      sha256: 's1',
      size: 5,
      content_type: 'text/markdown',
      updated_at: 't',
      body: [104, 101, 108, 108, 111],
    },
    'img/a.png': {
      path: 'img/a.png',
      sha256: 's2',
      size: 3,
      content_type: 'image/png',
      updated_at: 't',
      body: new Uint8Array([1, 2, 3]).buffer,
    },
    'big.bin': {
      path: 'big.bin',
      sha256: 's3',
      size: 2 * 1024 * 1024,
      content_type: 'application/octet-stream',
      updated_at: 't',
      body: null,
    },
  };
  const { callTool, statements } = setup({
    route: (sql, args, mode) => {
      if (mode === 'all') return Object.values(rows).map(({ body: _body, ...meta }) => meta);
      return rows[args[1]] ?? null;
    },
  });
  const text = (await callTool('get_content_file', { path: 'notes/a.md' })).body.result
    .structuredContent;
  assert.deepEqual([text.encoding, text.content], ['utf-8', 'hello']);
  const bin = (await callTool('get_content_file', { path: 'img/a.png' })).body.result
    .structuredContent;
  assert.deepEqual([bin.encoding, bin.content], ['base64', 'AQID']);
  const big = (await callTool('get_content_file', { path: 'big.bin' })).body.result;
  assert.equal(big.isError, true);
  const missing = (await callTool('get_content_file', { path: 'nope' })).body.result;
  assert.equal(missing.isError, true);
  const list = (await callTool('list_content_files', { prefix: 'a_%' })).body.result
    .structuredContent;
  assert.equal(list.count, 3);
  assert.ok(statements.some(({ args }) => args[0] === 'a\\_\\%%'));
});
