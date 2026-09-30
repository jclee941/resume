import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mintSessionToken } from '../../services/auth.js';
import { ADMIN_TOKEN, makeDb, mcpClient } from './mcp-test-kit.js';

const APP_ROWS = [
  { id: 'app-1', company: 'Acme', position: 'Engineer', status: 'applied', source: 'wanted' },
  { id: 'app-2', company: 'Globex', position: 'SRE', status: 'pending', source: 'jobkorea' },
];

const EXPECTED_TOOLS = {
  readOnly: [
    'get_status',
    'list_applications',
    'get_application',
    'get_stats',
    'get_report',
    'get_auto_apply_status',
    'get_auto_apply_config',
    'get_workflow_instance',
    'list_profile_sync_history',
    'get_master_resume',
    'list_content_files',
    'get_content_file',
  ],
  destructive: [
    'run_auto_apply',
    'approve_application',
    'start_resume_sync',
    'start_job_crawl',
    'refresh_platform_session',
  ],
  otherWrites: ['reject_application', 'update_application_status'],
};

function fixture() {
  const { db, statements } = makeDb((sql, _args, mode) => {
    if (/COUNT\(\*\)/i.test(sql)) return { count: APP_ROWS.length };
    return mode === 'all' ? APP_ROWS : null;
  });
  const env = { ADMIN_TOKEN, JOB_DB: db };
  return { env, statements, ...mcpClient(env) };
}

test('legacy initialize handshake is served without a session', async () => {
  const { send, authed } = fixture();
  const response = await send({
    method: 'POST',
    headers: authed({
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    }),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'legacy-client', version: '0' },
      },
    }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('mcp-session-id'), null);
  const text = await response.text();
  assert.match(text, /"name":"job-mcp-server"/);
  assert.match(text, /"protocolVersion"/);
});

test('server/discover reports the server identity and instructions', async () => {
  const { rpc } = fixture();
  const response = await rpc('server/discover');
  assert.equal(response.status, 200);
  const { result } = await response.json();
  assert.equal(result._meta['io.modelcontextprotocol/serverInfo'].name, 'job-mcp-server');
  assert.match(result.instructions, /human approval gate/);
});

test('tools/list exposes every tool with its annotations', async () => {
  const { rpc } = fixture();
  const response = await rpc('tools/list');
  assert.equal(response.status, 200);
  const { tools } = (await response.json()).result;
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const { readOnly, destructive, otherWrites } = EXPECTED_TOOLS;
  assert.deepEqual([...byName.keys()].sort(), [...readOnly, ...destructive, ...otherWrites].sort());
  for (const name of readOnly) assert.equal(byName.get(name).annotations.readOnlyHint, true, name);
  for (const name of destructive) {
    assert.equal(byName.get(name).annotations.readOnlyHint, false, name);
    assert.equal(byName.get(name).annotations.destructiveHint, true, name);
  }
  for (const name of otherWrites) {
    assert.equal(byName.get(name).annotations.readOnlyHint, false, name);
    assert.equal(byName.get(name).annotations.destructiveHint, false, name);
  }
  for (const name of ['run_auto_apply', 'start_resume_sync', 'start_job_crawl']) {
    assert.equal(byName.get(name).inputSchema.properties.dryRun.default, true, name);
  }
});

test('tools/call list_applications returns the D1 rows', async () => {
  const { callTool, statements } = fixture();
  const { status, body } = await callTool('list_applications', { status: 'applied', limit: 5 });
  assert.equal(status, 200);
  assert.notEqual(body.result.isError, true);
  assert.deepEqual(body.result.structuredContent.applications, APP_ROWS);
  assert.deepEqual(JSON.parse(body.result.content[0].text), body.result.structuredContent);
  assert.ok(statements.some(({ args }) => args.includes('applied')));
});

test('unknown tool is a -32602 protocol error', async () => {
  const { callTool } = fixture();
  const { body } = await callTool('no_such_tool');
  assert.equal(body.error.code, -32602);
});

test('invalid tool arguments become an isError result and touch nothing', async () => {
  const { callTool, statements } = fixture();
  const { status, body } = await callTool('list_applications', { limit: 'many' });
  assert.equal(status, 200);
  assert.equal(body.result.isError, true);
  assert.equal(statements.length, 0);
});

test('invalid JSON is 400 -32700 and a batch is 400', async () => {
  const { send, authed } = fixture();
  const headers = authed({
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  });
  const invalid = await send({ method: 'POST', headers, body: '{' });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, -32700);
  const batch = await send({
    method: 'POST',
    headers: {
      ...headers,
      'mcp-protocol-version': '2026-07-28',
      'mcp-method': 'server/discover',
    },
    body: JSON.stringify([
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'server/discover',
        params: {
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {},
          },
        },
      },
    ]),
  });
  assert.equal(batch.status, 400);
});

test('GET and DELETE are 405', async () => {
  const { send, authed } = fixture();
  for (const method of ['GET', 'DELETE']) {
    const response = await send({ method, headers: authed() });
    assert.equal(response.status, 405, method);
  }
});

test('missing or wrong Bearer is 401 with a challenge and runs no tool', async () => {
  const { send, callTool, authed, statements } = fixture();
  for (const authorization of [undefined, 'Bearer wrong-token', ADMIN_TOKEN]) {
    const headers = authed({ 'content-type': 'application/json' });
    if (authorization === undefined) delete headers.authorization;
    else headers.authorization = authorization;
    const response = await send({
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'list_applications', arguments: {} },
      }),
    });
    assert.equal(response.status, 401, String(authorization));
    assert.match(response.headers.get('www-authenticate'), /^Bearer/);
  }
  assert.equal(statements.length, 0);
  assert.equal((await callTool('list_applications')).status, 200);
});

test('an admin session cookie alone never authenticates', async () => {
  const { send, authed, env, statements } = fixture();
  const cookie = `adminToken=${await mintSessionToken(env)}`;
  const headers = authed({ 'content-type': 'application/json', cookie });
  delete headers.authorization;
  const response = await send({
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'server/discover' }),
  });
  assert.equal(response.status, 401);
  assert.equal(statements.length, 0);
});

test('a foreign browser Origin is 403 while the site origin passes', async () => {
  const { rpc, send, authed, statements } = fixture();
  const foreign = await send({
    method: 'POST',
    headers: authed({ origin: 'https://evil.example', 'content-type': 'application/json' }),
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'server/discover' }),
  });
  assert.equal(foreign.status, 403);
  assert.equal(statements.length, 0);
  assert.equal((await rpc('server/discover')).status, 200);
  const site = await send({
    method: 'POST',
    headers: authed({
      origin: 'https://resume.jclee.me',
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2026-07-28',
      'mcp-method': 'server/discover',
    }),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'server/discover',
      params: {
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': {},
        },
      },
    }),
  });
  assert.equal(site.status, 200);
  assert.equal(site.headers.get('access-control-allow-origin'), null);
});

test('a forged Host header is rejected before auth', async () => {
  const { send, authed } = fixture();
  const response = await send({
    method: 'POST',
    headers: authed({ host: 'attacker.example', 'content-type': 'application/json' }),
    body: '{}',
  });
  assert.ok(response.status >= 400 && response.status < 500);
  assert.notEqual(response.status, 401);
});
