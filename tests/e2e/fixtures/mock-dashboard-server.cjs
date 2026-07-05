const http = require('http');

class DashboardAuthError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'DashboardAuthError';
    this.status = status;
  }
}

let serverInstance;
let serverUrl;
let startupPromise;
let healthHits = 0;
const seenTokens = new Set();

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function html(res) {
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy':
      "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
    'x-frame-options': 'SAMEORIGIN',
    'x-content-type-options': 'nosniff',
    'strict-transport-security': 'max-age=31536000',
    'referrer-policy': 'no-referrer',
  });
  res.end(`<!doctype html>
<html><head><title>Job Dashboard</title></head>
<body>
  <header role="banner"><h1>Job Dashboard</h1></header>
  <main>
    <section id="stats" aria-labelledby="stats-heading"><h2 id="stats-heading">Stats</h2></section>
    <input id="searchBox" aria-label="Search applications">
    <select id="statusFilter" aria-label="Status"><option value="applied">Applied</option></select>
    <button id="searchBtn">Search</button><button id="dryRunBtn">Dry run</button><button id="applyBtn">Apply</button>
    <button type="button" onclick="document.getElementById('appModal').style.display='block'">+ 추가</button>
    <div id="appModal" style="display:none"><button class="close-btn" onclick="this.parentElement.style.display='none'">Close</button></div>
  </main>
</body></html>`);
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
  });
}

function tokenEmail(idToken) {
  let parsed;
  try {
    const [, payload = ''] = String(idToken || '').split('.');
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      throw new DashboardAuthError('invalid', 401);
    }
    throw error;
  }
  if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) {
    throw new DashboardAuthError('expired', 401);
  }
  return parsed.email || '';
}

async function handleLogin(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
    if (!payload || typeof payload !== 'object') {
      return json(res, 400, { error: 'invalid_json' });
    }
    const idToken = payload.idToken || payload.token;
    const email = tokenEmail(idToken);
    if (email !== 'admin@example.com') return json(res, 403, { error: 'forbidden' });
    if (req.headers['x-mock-replay-check'] === 'true') {
      if (seenTokens.has(idToken)) return json(res, 401, { error: 'replay' });
      seenTokens.add(idToken);
    }
    return json(
      res,
      200,
      { success: true, csrfToken: 'mock-csrf-token' },
      { 'set-cookie': 'adminToken=mock; HttpOnly; Secure; SameSite=Strict; Path=/' }
    );
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      return json(res, error.status, { error: 'invalid_token' });
    }
    if (error instanceof SyntaxError) {
      return json(res, 400, { error: 'invalid_token' });
    }
    throw error;
  }
}

function routeDashboard(req, res, url) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (url.pathname === '/job' || url.pathname === '/job/' || url.pathname === '/job/dashboard') {
    return html(res);
  }
  if (url.pathname === '/job/health' || url.pathname === '/job/api/health') {
    healthHits += 1;
    if (healthHits > 80) return json(res, 429, { error: 'rate limited' });
    return json(res, 200, {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }
  if (url.pathname === '/job/api/status') return json(res, 200, { status: 'ok', applications: 1 });
  if (url.pathname === '/job/api/stats')
    return json(res, 200, { total: 1, applied: 1, saved: 0, interview: 0, offer: 0, rejected: 0 });
  if (url.pathname === '/job/api/stats/weekly') return json(res, 200, [{ week: 'mock', total: 1 }]);
  if (url.pathname.startsWith('/job/api/report')) return json(res, 200, { total: 1 });
  if (url.pathname === '/job/api/applications' && req.method === 'GET') {
    return json(res, 200, { applications: [{ id: 'mock-app-1' }], page: 1, limit: 10, total: 1 });
  }
  if (url.pathname === '/job/api/search' || url.pathname === '/job/api/automation/search') {
    return json(res, 200, { results: [{ id: 'mock-job-1', platform: 'wanted' }] });
  }
  if (/\/(approve|reject)$/.test(url.pathname) && req.method === 'POST') {
    return json(res, 403, { error: 'forbidden' });
  }
  if (url.pathname.startsWith('/job/api/workflows/') && req.method === 'POST') {
    return json(res, 200, { instanceId: 'mock-instance', status: 'queued' });
  }
  if (url.pathname === '/job/api/auth/login' && req.method === 'POST') return handleLogin(req, res);
  if (url.pathname === '/job/api/auth/logout' && req.method === 'POST')
    return json(res, 200, { success: true }, { 'set-cookie': 'adminToken=; Max-Age=0; Path=/' });
  if (url.pathname === '/job/api/auth/status') return json(res, 401, { error: 'unauthenticated' });
  if (url.pathname === '/job/api/auth/profile') return json(res, 401, { error: 'unauthenticated' });
  if (url.pathname === '/job/api/auto-apply/status') return json(res, 200, { status: 'idle' });
  if (url.pathname === '/job/api/auto-apply/run') return json(res, 403, { error: 'forbidden' });
  if (url.pathname === '/job/api/auto-apply/config')
    return json(res, req.method === 'GET' ? 200 : 400, { maxDailyApplications: 5 });
  if (url.pathname === '/job/api/config')
    return json(res, req.method === 'GET' ? 200 : 400, { enabled: true });
  if (url.pathname.startsWith('/job/api/'))
    return json(res, req.method === 'GET' ? 404 : 403, { error: 'not found' });
  return json(res, 404, { error: 'not found' });
}

async function createServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname === '/api/auth/login' && req.method === 'POST') return handleLogin(req, res);
      if (url.pathname === '/api/auth/logout' && req.method === 'POST')
        return json(res, 200, { success: true });
      return routeDashboard(req, res, url);
    });
    let triedEphemeralPort = false;
    server.once('listening', () => {
      const address = server.address();
      const actualPort = address && typeof address === 'object' ? address.port : port;
      resolve({ server, url: `http://localhost:${actualPort}` });
    });
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE' && !triedEphemeralPort) {
        triedEphemeralPort = true;
        server.listen(0);
        return;
      }
      reject(error);
    });
    server.listen(port);
  });
}

async function getDashboardServer(port = 9494) {
  if (serverInstance && serverUrl) return { server: serverInstance, url: serverUrl };
  if (startupPromise) return startupPromise;
  startupPromise = (async () => {
    const created = await createServer(port);
    serverInstance = created.server;
    serverUrl = created.url;
    return { server: serverInstance, url: serverUrl };
  })();
  return startupPromise;
}

module.exports = { getDashboardServer };
