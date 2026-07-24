'use strict';

const { createMockServerInternal } = require('./mock-job-site-runtime');
const {
  USER_AGENTS,
  getApplicationCount: getLocalApplicationCount,
  getApplications,
  resetMockState,
} = require('./mock-job-site-state');
const { getApplicationFormHtml, getMultiStepFormHtml } = require('./mock-job-site-markup');

let serverInstance = null;
let serverUrl = null;
let startupPromise = null;

async function getServer(port = 9393) {
  if (serverInstance && serverUrl) return { server: serverInstance, url: serverUrl };
  if (startupPromise) return startupPromise;
  startupPromise = (async () => {
    serverUrl = `http://localhost:${port}`;
    serverInstance = await createMockServerInternal(port);
    return { server: serverInstance, url: serverUrl };
  })();
  return startupPromise;
}

async function createMockServer(port = 9393) {
  const { server } = await getServer(port);
  return server;
}

async function stopMockServer(server) {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => {
      console.log('[Mock Server] Server stopped');
      resolve();
    });
  });
}

async function getApplicationCount(port = 9393) {
  const baseUrl = serverUrl || `http://localhost:${port}`;
  try {
    const response = await fetch(`${baseUrl}/__admin/applications/count`);
    if (!response.ok) throw new Error(`Failed to fetch application count: ${response.status}`);
    return (await response.json()).count;
  } catch {
    return getLocalApplicationCount();
  }
}

async function resetApplications(port = 9393) {
  const baseUrl = serverUrl || `http://localhost:${port}`;
  try {
    const response = await fetch(`${baseUrl}/__admin/reset`, { method: 'POST' });
    if (!response.ok) throw new Error(`Failed to reset mock server state: ${response.status}`);
    return (await response.json()).count;
  } catch {
    resetMockState();
    return getLocalApplicationCount();
  }
}

async function waitForApplicationCount(expectedCount, options = {}) {
  const { timeout = 5000, interval = 50, port = 9393 } = options;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const count = await getApplicationCount(port);
    if (count === expectedCount) return count;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return getApplicationCount(port);
}

module.exports = {
  getServer,
  createMockServer,
  stopMockServer,
  getApplicationCount,
  getApplications,
  resetApplications,
  waitForApplicationCount,
  getApplicationFormHtml,
  getMultiStepFormHtml,
  USER_AGENTS,
};
