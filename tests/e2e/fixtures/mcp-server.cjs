// @ts-check

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const MCP_SERVER_PATH = path.resolve(PROJECT_ROOT, 'apps/job-server/src/index.js');
const MCP_REQUEST_TIMEOUT_MS = 10000;

function hasExternalWantedMcpEnv() {
  return (
    process.env.RUN_EXTERNAL_E2E === '1' &&
    Boolean(process.env.WANTED_EMAIL) &&
    Boolean(
      process.env.WANTED_COOKIES ||
      (process.env.WANTED_PASSWORD && process.env.WANTED_ONEID_CLIENT_ID)
    )
  );
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

function resolvePendingMessage(message, pendingRequests) {
  if (!message || typeof message !== 'object' || message.id == null) return;
  const pending = pendingRequests.get(message.id);
  if (!pending) return;
  pending.resolve(message);
  pendingRequests.delete(message.id);
}

async function startMCPServer() {
  const proc = spawn('node', [MCP_SERVER_PATH], {
    cwd: PROJECT_ROOT,
    stdio: ['pipe', 'pipe', 'ignore'],
  });

  let messageId = 0;
  const pendingRequests = new Map();
  let buffer = '';

  proc.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      resolvePendingMessage(parseJsonLine(line), pendingRequests);
    }
  });

  const send = (message) => {
    const id = ++messageId;
    const request = { jsonrpc: '2.0', id, ...message };
    proc.stdin.write(`${JSON.stringify(request)}\n`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`MCP request timeout: ${message.method}`));
        }
      }, MCP_REQUEST_TIMEOUT_MS);
      pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
      });
    });
  };

  const close = () => {
    pendingRequests.clear();
    proc.kill();
  };

  return { process: proc, send, close };
}

async function initializeMCP(mcp) {
  return mcp.send({
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'e2e-test-client', version: '1.0.0' },
    },
  });
}

async function startInitializedMCP() {
  const mcp = await startMCPServer();
  try {
    await initializeMCP(mcp);
    return mcp;
  } catch (error) {
    mcp.close();
    throw error;
  }
}

async function tryStartInitializedMCP() {
  try {
    return await startInitializedMCP();
  } catch (error) {
    if (error instanceof Error) return null;
    throw error;
  }
}

module.exports = {
  hasExternalWantedMcpEnv,
  initializeMCP,
  startInitializedMCP,
  startMCPServer,
  tryStartInitializedMCP,
};
